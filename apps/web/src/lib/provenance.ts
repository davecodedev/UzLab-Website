// Where the registry's data comes from — the facts a server render and a client
// render both need.
//
// Deliberately outside DataProvenance.tsx: that file is "use client", and a
// value imported from a client module into a Server Component arrives as a
// client-reference stub rather than the value itself. The page silently built
// its request URL out of that stub, got a 404, and showed nothing.

/** GET /imports/provenance — public, no authentication. */
export const PROVENANCE_PATH = "/imports/provenance";

export interface ProvenanceSource {
  /** NationalRegister — "AKKRED" or "DEPSTAN". */
  register: string;
  /** The issuing body, as it names itself. Rendered verbatim, never translated. */
  name: string;
  /** The official register's public address — the authoritative version. */
  url: string;
  /** How often we re-check the source: "hourly" or "daily". */
  refresh: string;
  /** Published, currently-listed records imported from this register. */
  records: number;
  /**
   * When an import run last confirmed this register against its source — a run
   * that found no changes still confirms the data. Null means it has never been
   * confirmed, which the UI states plainly rather than hiding.
   */
  lastVerifiedAt: string | null;
}

/**
 * The two registers' stable public entry points, for chrome that is on every
 * page and cannot fetch (the footer). Anything time-sensitive — record counts,
 * verification dates — comes from the API instead, never from here.
 */
export const REGISTER_SITES = [
  { name: "O'zAkk", url: "https://akkred.uz/uz/reestr" },
  { name: "Depstan", url: "https://approval.depstan.uz/" },
] as const;

/**
 * Which sources belong on which page. `/imports/provenance` reports every
 * source the site holds; a page must show only the ones its own data came from,
 * or the registry would claim a standards catalogue as its provenance and the
 * catalogue would claim an accreditation register as its own.
 */
export const LABORATORY_SOURCES = ["AKKRED", "DEPSTAN"] as const;
export const STANDARD_SOURCES = ["UZSTI", "MGS", "ISO", "CEN"] as const;
