import { foldForSearch } from './translit';

/** The fields that contribute to a laboratory's search key. */
export interface SearchableLaboratory {
  name?: string | null;
  legalEntityName?: string | null;
  accreditationNumber?: string | null;
  taxId?: string | null;
  standard?: string | null;
  bodyTypeLabel?: string | null;
  accreditationBody?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  legalEntityAddress?: string | null;
  supervisorName?: string | null;
  description?: string | null;
  directions?: string[] | null;
  /** The scope-of-accreditation document text — the bulk of the key. */
  scopeText?: string | null;
}

/**
 * Builds the folded, script-neutral key stored in `Laboratory.searchText`.
 *
 * Defined once and used by both the importers and the backfill so the two can
 * never drift: a key built differently in one place would make records
 * findable or unfindable depending on which code last touched them.
 */
export function buildSearchKey(lab: SearchableLaboratory): string {
  const parts = [
    lab.name,
    lab.legalEntityName,
    lab.accreditationNumber,
    lab.taxId,
    lab.standard,
    lab.bodyTypeLabel,
    lab.accreditationBody,
    lab.region,
    lab.city,
    lab.address,
    lab.legalEntityAddress,
    lab.supervisorName,
    lab.description,
    ...(lab.directions ?? []),
    lab.scopeText,
  ].filter((v): v is string => Boolean(v && v.trim()));

  // Deduplicating whole terms keeps the key small without weakening matching:
  // a scope document repeats the same standard names dozens of times, and
  // trigram search cares whether a term is present, not how often.
  const seen = new Set<string>();
  for (const term of foldForSearch(parts.join(' ')).split(' ')) {
    if (term) seen.add(term);
  }
  return [...seen].join(' ');
}
