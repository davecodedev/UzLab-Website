import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';

/**
 * One device at a time.
 *
 * The rule lives in the JWT strategy rather than only at refresh, because a
 * displaced device holds an access token that stays cryptographically valid
 * for up to fifteen minutes. These tests are what stops that regressing back
 * into a fifteen-minute hole.
 */
describe('single-session enforcement', () => {
  function strategyFor(user: Record<string, unknown>) {
    const prisma = {
      user: { findUnique: () => Promise.resolve(user) },
    } as unknown as PrismaService;
    const config = {
      getOrThrow: () => 'test-secret',
      get: (_k: string, d?: unknown) => d,
    } as unknown as ConfigService;
    return new JwtStrategy(config, prisma);
  }

  const base = {
    id: 'u1',
    email: 'lab@example.uz',
    fullName: 'Lab',
    deletedAt: null,
  };

  it('accepts the device holding the current session', async () => {
    const s = strategyFor({ ...base, role: 'MEMBER', activeSessionId: 'sess-1' });
    await expect(
      s.validate({ sub: 'u1', email: base.email, role: 'MEMBER', sid: 'sess-1' }),
    ).resolves.toMatchObject({ id: 'u1' });
  });

  it('rejects a second device once the first has been displaced', async () => {
    // The newer login moved activeSessionId on; the older token still carries
    // the id it was minted under.
    const s = strategyFor({ ...base, role: 'MEMBER', activeSessionId: 'sess-2' });
    await expect(
      s.validate({ sub: 'u1', email: base.email, role: 'MEMBER', sid: 'sess-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token carrying no session at all once one has been opened', async () => {
    const s = strategyFor({ ...base, role: 'MEMBER', activeSessionId: 'sess-2' });
    await expect(
      s.validate({ sub: 'u1', email: base.email, role: 'MEMBER' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lets pre-existing logins through, so deploying it signs nobody out', async () => {
    // activeSessionId is null for every account that has not signed in since
    // the column was added.
    const s = strategyFor({ ...base, role: 'MEMBER', activeSessionId: null });
    await expect(
      s.validate({ sub: 'u1', email: base.email, role: 'MEMBER' }),
    ).resolves.toMatchObject({ id: 'u1' });
  });

  it('exempts staff, who legitimately work from more than one machine', async () => {
    for (const role of ['ADMIN', 'STAFF']) {
      const s = strategyFor({ ...base, role, activeSessionId: 'sess-2' });
      await expect(
        s.validate({ sub: 'u1', email: base.email, role, sid: 'sess-1' }),
      ).resolves.toMatchObject({ role });
    }
  });

  it('still refuses a deleted account regardless of session', async () => {
    const s = strategyFor({
      ...base,
      role: 'MEMBER',
      deletedAt: new Date(),
      activeSessionId: 'sess-1',
    });
    await expect(
      s.validate({ sub: 'u1', email: base.email, role: 'MEMBER', sid: 'sess-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
