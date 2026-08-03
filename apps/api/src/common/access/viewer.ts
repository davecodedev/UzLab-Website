import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../types/authenticated-request.js';

/**
 * How much of a laboratory record the caller is entitled to see.
 *
 * The registry republishes public government data, so the free view is a real
 * view rather than a locked door — a reader can find a laboratory by name and
 * see where it is. What a subscription buys is the rest of the record in one
 * place: accreditation numbers and validity, contacts, scope, documents.
 *
 * Enforced in the service layer, never in the browser. The endpoint used to
 * return every field and let the client hide some, which is not access control
 * — it is one devtools panel away from being no control at all.
 */
export enum AccessTier {
  /** Not signed in. Name and location only. */
  PUBLIC = 'PUBLIC',
  /** Signed in, no active membership. Same as public for now. */
  REGISTERED = 'REGISTERED',
  /** Active member, or staff. The whole record. */
  FULL = 'FULL',
}

export interface Viewer {
  user?: AuthenticatedUser;
  tier: AccessTier;
}

export const ANONYMOUS: Viewer = { tier: AccessTier.PUBLIC };

/** Staff and admins always see everything — they have to review it. */
function isStaff(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.STAFF;
}

/**
 * A membership counts while it has not expired. `expiresAt` null means no end
 * date was set, which the membership review flow uses for open-ended entries,
 * so it counts as current rather than as already lapsed.
 */
export function membershipIsActive(
  member: { expiresAt: Date | null } | null,
): boolean {
  if (!member) return false;
  return member.expiresAt === null || member.expiresAt.getTime() > Date.now();
}

export function viewerFor(
  user: AuthenticatedUser | undefined,
  member: { expiresAt: Date | null } | null,
): Viewer {
  if (!user) return ANONYMOUS;
  if (isStaff(user.role) || membershipIsActive(member)) {
    return { user, tier: AccessTier.FULL };
  }
  return { user, tier: AccessTier.REGISTERED };
}

/**
 * The fields a laboratory record exposes to a viewer who is not entitled to the
 * whole thing: what it is called and where to find it.
 *
 * `id` and `slug` are identifiers rather than data — without them the list
 * cannot link to anything — and `source` distinguishes a register import from a
 * self-declared entry, which a reader needs in order to weigh what they are
 * looking at.
 */
export const PUBLIC_LABORATORY_FIELDS = [
  'id',
  'slug',
  'name',
  'region',
  'city',
  'address',
  'source',
] as const;

export type PublicLaboratoryField = (typeof PUBLIC_LABORATORY_FIELDS)[number];

/** True when the viewer gets the complete record. */
export function seesEverything(viewer: Viewer): boolean {
  return viewer.tier === AccessTier.FULL;
}

/**
 * Narrows a record to the public fields. Written as a pick rather than a set of
 * deletes so a column added to the schema later is hidden by default: the
 * failure mode of forgetting to add a field is a missing field, not a leak.
 */
export function toPublicLaboratory<T extends Record<string, unknown>>(
  lab: T,
): Pick<T, PublicLaboratoryField & keyof T> {
  const out = {} as Record<string, unknown>;
  for (const field of PUBLIC_LABORATORY_FIELDS) {
    if (field in lab) out[field] = lab[field];
  }
  return out as Pick<T, PublicLaboratoryField & keyof T>;
}
