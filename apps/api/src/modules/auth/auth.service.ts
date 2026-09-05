import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MemberStatus } from '@prisma/client';

const REFRESH_BYTES = 40;

/**
 * Staff are exempt from the one-session rule.
 *
 * It exists to stop a paid membership being shared around a dozen machines.
 * An administrator moving between a laptop and a desk is not that, and
 * throwing them out of one to use the other would make the panel painful for
 * no security gain.
 */
const SESSION_EXEMPT = new Set<string>(['ADMIN', 'STAFF']);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Mints an access/refresh pair bound to a session.
   *
   * `sessionId` is threaded into the access token as `sid` and checked on
   * every request. A fresh login generates a new one and revokes every
   * outstanding refresh token, which is what makes a second sign-in end the
   * first — a refresh alone passes the existing id straight through, because
   * that is the same device carrying on.
   */
  private async issueTokens(
    user: { id: string; email: string; role: string },
    sessionId: string,
    deviceLabel?: string,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, sid: sessionId },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
      } as JwtSignOptions,
    );

    const refreshToken = crypto.randomBytes(REFRESH_BYTES).toString('hex');
    const refreshTtlDays = 30;
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        activeSessionId: sessionId,
        activeSessionAt: new Date(),
        ...(deviceLabel ? { activeSessionLabel: deviceLabel } : {}),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Opens a session, displacing whatever was there.
   *
   * Revoking the old refresh tokens is not enough on its own — the displaced
   * device still holds an access token good for up to fifteen minutes — which
   * is why the session id is checked per request rather than only at refresh.
   */
  private async startSession(
    user: { id: string; email: string; role: string },
    deviceLabel?: string,
  ) {
    const sessionId = crypto.randomUUID();
    if (!SESSION_EXEMPT.has(user.role)) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return this.issueTokens(user, sessionId, deviceLabel);
  }

  async register(dto: RegisterDto, deviceLabel?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
      },
    });

    const tokens = await this.startSession(user, deviceLabel);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto, deviceLabel?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.startSession(user, deviceLabel);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Rotate: revoke the used token, issue a new pair.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Carries the existing session forward rather than opening a new one — a
    // refresh is the same device continuing, and minting a new id here would
    // let a displaced device quietly take the session back.
    const tokens = await this.issueTokens(
      user,
      user.activeSessionId ?? crypto.randomUUID(),
    );
    return { user: this.toPublicUser(user), ...tokens };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Clearing the session is what makes the still-valid access token stop
    // working immediately, rather than lingering until it expires.
    if (stored) {
      await this.prisma.user.update({
        where: { id: stored.userId },
        data: { activeSessionId: null, activeSessionAt: null },
      });
    }
    return { success: true };
  }

  // --- Access keys --------------------------------------------------------

  /**
   * The alphabet a key is drawn from.
   *
   * No 0/O/1/I/L — these get read aloud down a phone line and typed in by
   * somebody else, and those four are where that goes wrong.
   */
  private static readonly KEY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

  /** `UZLAB-7Q4K-9XPM-2WRT`. Four groups so it can be read out in chunks. */
  static generateAccessKey(): string {
    const groups: string[] = [];
    for (let g = 0; g < 3; g += 1) {
      let out = '';
      for (let i = 0; i < 4; i += 1) {
        const idx = crypto.randomInt(0, AuthService.KEY_ALPHABET.length);
        out += AuthService.KEY_ALPHABET[idx];
      }
      groups.push(out);
    }
    return `UZLAB-${groups.join('-')}`;
  }

  static hashAccessKey(key: string): string {
    return crypto
      .createHash('sha256')
      .update(key.trim().toUpperCase())
      .digest('hex');
  }

  /**
   * Signing in with the organisation's access key instead of an email and a
   * password.
   *
   * Only an approved, unfrozen, unexpired membership may do it — the key is
   * the membership, so a suspended one has to stop working the moment it is
   * suspended rather than at its next renewal.
   */
  async loginWithAccessKey(accessKey: string, deviceLabel?: string) {
    const member = await this.prisma.member.findUnique({
      where: { accessKeyHash: AuthService.hashAccessKey(accessKey) },
      select: {
        status: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            fullName: true,
            deletedAt: true,
          },
        },
      },
    });

    // One message for every failure: a key that says "correct, but frozen" is
    // a key that confirms itself to somebody guessing.
    const invalid = new UnauthorizedException('This access key is not valid.');
    if (!member || member.user.deletedAt) throw invalid;
    if (member.status !== MemberStatus.ACTIVE) throw invalid;
    if (member.expiresAt && member.expiresAt.getTime() <= Date.now()) {
      throw invalid;
    }

    const tokens = await this.startSession(member.user, deviceLabel);
    return { user: this.toPublicUser(member.user), ...tokens };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
