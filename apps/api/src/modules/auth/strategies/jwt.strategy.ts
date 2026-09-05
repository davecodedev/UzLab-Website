import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: string;
  /**
   * The session this token was minted under. Absent on tokens issued before
   * single-session enforcement existed.
   */
  sid?: string;
}

/**
 * Staff may be signed in on more than one machine — see the note in
 * AuthService. The rule is about shared paid memberships, not about people
 * who administer the thing.
 */
const SESSION_EXEMPT = new Set<string>(['ADMIN', 'STAFF']);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtAccessPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }

    // One session at a time. Checked here rather than only at refresh so a
    // displaced device stops working on its next request instead of when its
    // access token happens to expire.
    //
    // A null `activeSessionId` means this account has not signed in since the
    // rule was introduced, and is allowed through — the alternative was
    // signing every existing user out on deploy.
    if (
      !SESSION_EXEMPT.has(user.role) &&
      user.activeSessionId !== null &&
      payload.sid !== user.activeSessionId
    ) {
      throw new UnauthorizedException(
        'This account was signed in on another device. Only one device can use it at a time.',
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
  }
}
