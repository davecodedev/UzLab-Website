import { ThrottlerModule, seconds } from '@nestjs/throttler';

/**
 * Request limits.
 *
 * One throttler, overridden per route — not three named ones. Named throttlers
 * all apply to every route simultaneously: declaring `auth` at ten requests per
 * fifteen minutes alongside a general limit does not restrict sign-in, it
 * restricts *everything* to ten requests per fifteen minutes. Overriding the
 * single default per route is the only arrangement where a strict limit stays
 * where it was aimed.
 *
 * The baseline is deliberately generous. The registry page makes several calls
 * on load, and a limit that catches an ordinary visitor clicking around is a
 * limit that will be removed the first time someone complains — which leaves
 * nothing at all.
 */
export const THROTTLE_DEFAULT_TTL = seconds(60);
export const THROTTLE_DEFAULT_LIMIT = 240;

/**
 * Sign-in and registration, where the threat is someone working through a
 * password list rather than reading pages. There is no account lockout yet, so
 * this is the only thing between an attacker and unlimited guesses.
 */
export const THROTTLE_AUTH = { ttl: seconds(900), limit: 10 };

/**
 * The endpoints that return the whole registry in one response. Uncapped, the
 * public view is a single curl away from being copied wholesale — which is
 * what the field limits exist to prevent.
 */
export const THROTTLE_BULK = { ttl: seconds(60), limit: 12 };

/** The keyword search scans the folded index; cheaper than the full list. */
export const THROTTLE_SEARCH = { ttl: seconds(60), limit: 30 };

export const ThrottlingModule = ThrottlerModule.forRoot({
  throttlers: [{ ttl: THROTTLE_DEFAULT_TTL, limit: THROTTLE_DEFAULT_LIMIT }],
});
