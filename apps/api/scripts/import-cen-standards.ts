/**
 * The CEN and CENELEC European catalogues, from standards.cencenelec.eu.
 *
 * The source caps every search at 1 000 rows and does not say so, so the crawl
 * is partitioned by technical committee: every deliverable belongs to exactly
 * one, the committee list is published by the search form itself, and no single
 * committee comes close to the ceiling. A committee that ever does is split
 * again by status rather than silently truncated, and anything still capped
 * after that is reported as a gap instead of being written as if complete.
 *
 * The committee is used only as the partition key. It is not stored: it is not
 * something the catalogue's readers filter on here, and it was explicitly not
 * asked for.
 */
import { createHash } from 'node:crypto';
import { PrismaClient, StandardRegister, StandardStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  RESULT_CAP,
  listCommitteeCodes,
  search,
  type CenRow,
} from './lib/cen-search';
import {
  runStandardImport,
  type ScrapedStandard,
  type StandardScrapeResult,
} from './lib/safe-standard-import';

/**
 * How a committee that hits the ceiling gets subdivided.
 *
 * Not by status: the form offers status checkboxes, but they are ignored by the
 * server — all six return byte-identical result sets, which is what made the
 * first attempt at this look like it was working while changing nothing.
 *
 * Not by deliverable type either, at least not alone: the type list offers only
 * the five current kinds, and the catalogue still carries CR and ENV documents
 * from before they existed, which a type-split silently drops.
 *
 * So it is by reference prefix, with the vocabulary of prefixes learned from
 * every committee that did *not* hit the ceiling. The catalogue's own data
 * decides what prefixes exist rather than a list written here going stale.
 */
const MIN_PREFIX_SAMPLE = 20;

/** Pause between searches. The source is a shared public service, not ours. */
const DELAY_MS = 250;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The catalogue's own status wordings, mapped onto the shared enum.
 *
 * "Published" is the only one that means in force. Everything in the approval
 * pipeline — enquiry, vote, approval — is adopted-but-not-yet-effective, and
 * that is a meaningfully different thing from a withdrawn document, so the two
 * are not collapsed. Unrecognised wordings fall to UNKNOWN and are reported at
 * the end rather than being guessed at.
 */
function mapStatus(label: string): StandardStatus {
  const value = label.trim().toLowerCase();
  if (value === 'published') return StandardStatus.IN_FORCE;
  if (value === 'withdrawn') return StandardStatus.WITHDRAWN;
  if (value === 'superseded' || value === 'replaced') return StandardStatus.SUPERSEDED;
  if (
    value.startsWith('under ') ||
    value.startsWith('draft') ||
    value === 'approved' ||
    value === 'registered' ||
    value === 'preliminary'
  ) {
    return StandardStatus.NOT_YET_IN_FORCE;
  }
  return StandardStatus.UNKNOWN;
}

/** "EN 1001-1:2005", "EN IEC 61439-2:2021/FprAA:2025" — the year is the last one named. */
function yearOf(reference: string): number | undefined {
  const years = [...reference.matchAll(/:(\d{4})\b/g)].map((m) => Number(m[1]));
  if (!years.length) return undefined;
  const year = Math.max(...years);
  return year >= 1900 && year <= 2100 ? year : undefined;
}

function dateOf(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function baseSlug(reference: string): string {
  const stem = reference
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `cen-${stem || 'standard'}`;
}

/**
 * Slugs have to be unique, and reducing a reference to lowercase alphanumerics
 * does not preserve that: the catalogue writes the same document's parts with
 * different punctuation, so two distinct references can land on one stem. The
 * first run discovered this the hard way, half way through a write.
 *
 * Colliding stems get a short digest of the full reference appended — to *every*
 * member of the colliding group, not just the later ones, so the result depends
 * on the set of references and not on the order they were crawled in.
 */
function assignSlugs(records: ScrapedStandard[]): number {
  const byStem = new Map<string, ScrapedStandard[]>();
  for (const record of records) {
    const stem = baseSlug(record.sourceId);
    const group = byStem.get(stem);
    if (group) group.push(record);
    else byStem.set(stem, [record]);
  }

  let disambiguated = 0;
  for (const [stem, group] of byStem) {
    if (group.length === 1) {
      group[0].slug = stem;
      continue;
    }
    for (const record of group) {
      const digest = createHash('sha1').update(record.sourceId).digest('hex').slice(0, 7);
      record.slug = `${stem}-${digest}`;
      disambiguated += 1;
    }
  }
  return disambiguated;
}

function toRecord(row: CenRow): ScrapedStandard | null {
  const reference = row.reference.trim();
  if (!reference || !row.title.trim()) return null;

  // The withdrawal date is the only "until" the source publishes; publication
  // is preferred over availability for "from" because that is the date the
  // document takes effect in the member countries.
  const effectiveFrom = dateOf(row.dop) ?? dateOf(row.dav) ?? dateOf(row.dor);

  return {
    sourceId: reference,
    // Replaced by assignSlugs once the whole set is known.
    slug: baseSlug(reference),
    data: {
      // The search application has no stable per-document URL that survives a
      // session, so readers are sent to the search itself.
      sourceUrl: 'https://standards.cencenelec.eu/dyn/www/f?p=CEN:105::RESET::::',
      designation: reference,
      title: row.title.trim(),
      status: mapStatus(row.status),
      statusLabel: row.status.trim() || null,
      language: 'en',
      year: yearOf(reference),
      effectiveFrom,
      effectiveUntil: dateOf(row.dow),
    },
  };
}

/** "CEN/TR 14734:2004" -> "CEN/TR"; "prEN 50191:2026" -> "prEN". */
function prefixOf(reference: string): string {
  return reference.trim().split(/\s+/)[0] ?? '';
}

async function scrape(): Promise<StandardScrapeResult> {
  const committees = await listCommitteeCodes();
  console.log(`${committees.length} technical committees to walk`);

  const byReference = new Map<string, ScrapedStandard>();
  const fetchFailures: string[] = [];
  const unmappedStatuses = new Map<string, number>();
  /** Committees whose first search hit the ceiling, revisited in a second pass. */
  const cappedCommittees: { value: string; label: string }[] = [];
  const prefixes = new Set<string>();

  const take = (rows: CenRow[]) => {
    for (const row of rows) {
      if (mapStatus(row.status) === StandardStatus.UNKNOWN && row.status.trim()) {
        unmappedStatuses.set(row.status, (unmappedStatuses.get(row.status) ?? 0) + 1);
      }
      const record = toRecord(row);
      // The same document is reachable from more than one committee listing;
      // the reference is the identity, so the first sighting wins.
      if (record && !byReference.has(record.sourceId)) {
        byReference.set(record.sourceId, record);
      }
    }
  };

  let done = 0;
  for (const committee of committees) {
    done += 1;
    try {
      const result = await search({ tcCode: committee.value });
      take(result.rows);
      if (result.capped) {
        cappedCommittees.push(committee);
      } else {
        // Only an uncapped committee is a trustworthy sample of what prefixes
        // exist: a truncated one shows whatever sorted first.
        for (const row of result.rows) {
          const prefix = prefixOf(row.reference);
          if (prefix) prefixes.add(prefix);
        }
      }
    } catch (error) {
      fetchFailures.push(`${committee.label}: ${(error as Error).message}`);
    }

    if (done % 50 === 0) {
      console.log(
        `  ${done}/${committees.length} committees, ${byReference.size.toLocaleString('en-GB')} documents so far`,
      );
    }
    await sleep(DELAY_MS);
  }

  const stillCapped: string[] = [];
  if (cappedCommittees.length) {
    if (prefixes.size < MIN_PREFIX_SAMPLE) {
      throw new Error(
        `only ${prefixes.size} reference prefixes were learned; too few to subdivide safely`,
      );
    }
    const vocabulary = [...prefixes].sort();
    console.log(
      `${cappedCommittees.length} committee(s) hit the cap; re-walking them across ` +
        `${vocabulary.length} reference prefixes`,
    );

    for (const committee of cappedCommittees) {
      let anyStillCapped = false;
      for (const prefix of vocabulary) {
        try {
          const part = await search({ tcCode: committee.value, reference: prefix });
          take(part.rows);
          if (part.capped) anyStillCapped = true;
        } catch (error) {
          fetchFailures.push(`${committee.label} (${prefix}): ${(error as Error).message}`);
        }
        await sleep(DELAY_MS);
      }
      if (anyStillCapped) stillCapped.push(committee.label);
      console.log(`  ${committee.label}: re-walked${anyStillCapped ? ' — STILL CAPPED' : ''}`);
    }
  }

  if (unmappedStatuses.size) {
    console.log('status wordings that fell through to UNKNOWN:');
    for (const [label, count] of [...unmappedStatuses].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${label}: ${count}`);
    }
  }

  // Loud, because a capped partition means the catalogue is incomplete and the
  // number below would otherwise read as the whole of it.
  if (stillCapped.length) {
    console.log(
      `INCOMPLETE: ${stillCapped.length} committee(s) still at the ${RESULT_CAP}-row cap ` +
        `even split by prefix — ${stillCapped.join(', ')}`,
    );
  }

  const records = [...byReference.values()];
  const disambiguated = assignSlugs(records);

  console.log(
    `${records.length.toLocaleString('en-GB')} distinct documents` +
      (disambiguated ? `, ${disambiguated} slug(s) disambiguated` : '') +
      (fetchFailures.length ? `, ${fetchFailures.length} search(es) failed` : ''),
  );

  // A duplicate here would fail mid-write again, thousands of rows in.
  const slugs = new Set(records.map((r) => r.slug));
  if (slugs.size !== records.length) {
    throw new Error(
      `slug collision survived disambiguation: ${records.length} records, ${slugs.size} slugs`,
    );
  }

  return { records, fetchFailures };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const trigger = process.env.IMPORT_TRIGGER ?? 'manual';
  const force = process.argv.includes('--force');

  try {
    await runStandardImport(
      { prisma, register: StandardRegister.CEN, trigger, force },
      scrape,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
