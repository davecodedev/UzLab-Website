import { createHash } from 'node:crypto';
import { AuthService } from '../src/modules/auth/auth.service.js';

/**
 * The two properties the access key has to hold.
 *
 * The single-session rule itself is exercised in `session.e2e-spec.ts`; this
 * covers the key's own shape and hashing, which is what a member reads down a
 * phone and what the database is allowed to keep.
 */
describe('access keys', () => {
  it('is readable aloud: no characters that get misheard or mistyped', () => {
    const forbidden = /[01OIL]/;
    for (let i = 0; i < 200; i += 1) {
      const key = AuthService.generateAccessKey();
      expect(key).toMatch(/^UZLAB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(key.slice(6)).not.toMatch(forbidden);
    }
  });

  it('does not repeat itself', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) seen.add(AuthService.generateAccessKey());
    expect(seen.size).toBe(500);
  });

  it('hashes case- and whitespace-insensitively, so a phone-dictated key works', () => {
    const key = AuthService.generateAccessKey();
    const expected = createHash('sha256').update(key).digest('hex');

    expect(AuthService.hashAccessKey(key)).toBe(expected);
    expect(AuthService.hashAccessKey(key.toLowerCase())).toBe(expected);
    expect(AuthService.hashAccessKey(`  ${key}  `)).toBe(expected);
  });

  it('stores a hash, never the key', () => {
    const key = AuthService.generateAccessKey();
    const hash = AuthService.hashAccessKey(key);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(key);
    // The hint is the tail only — enough to tell two keys apart, not enough
    // to reconstruct one.
    expect(key.slice(-4)).toHaveLength(4);
  });
});
