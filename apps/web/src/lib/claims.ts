// Shapes of the `/claims` endpoints (apps/api/src/modules/claims). A claim is a
// member's request to manage one laboratory; once approved it unlocks the
// supplementary profile — additive detail that never contradicts the register.

export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Member-supplied detail. Mirrors the Prisma `LaboratoryProfile` model. */
export interface LaboratoryProfile {
  id: string;
  laboratoryId: string;
  publicPhone: string | null;
  publicEmail: string | null;
  publicWebsite: string | null;
  contactPerson: string | null;
  description: string | null;
  servicesText: string | null;
  workingHours: string | null;
  specialisations: string[];
  logoUrl: string | null;
  updatedAt: string;
}

/**
 * Exactly the keys `UpdateProfileDto` whitelists. The API rejects any other
 * key with a 400, so the PATCH body is built from this type and nothing else.
 * `null` clears a field — class-validator's `@IsOptional()` lets null through.
 */
export interface ProfilePatch {
  publicPhone: string | null;
  publicEmail: string | null;
  publicWebsite: string | null;
  contactPerson: string | null;
  description: string | null;
  servicesText: string | null;
  workingHours: string | null;
  specialisations: string[];
  logoUrl: string | null;
}

/** One entry of GET /claims/mine. */
export interface MyClaim {
  id: string;
  laboratoryId: string;
  status: ClaimStatus;
  evidence: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  laboratory: {
    id: string;
    name: string;
    slug: string;
    accreditationNumber: string | null;
    register: string | null;
    profile: LaboratoryProfile | null;
  };
}

/** Minimum length the API enforces on `evidence`. */
export const EVIDENCE_MIN_LENGTH = 20;

/**
 * Short names of the two national registers. Proper names of the source
 * systems — not translated.
 */
export const REGISTER_SHORT: Record<string, string> = {
  AKKRED: "O'zAkk (akkred.uz)",
  DEPSTAN: "approval.depstan.uz",
};
