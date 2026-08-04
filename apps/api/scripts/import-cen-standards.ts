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
import { PrismaClient, StandardRegister, StandardStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  listCommitteeCodes,
  search,
  type CenRow,
} from './lib/cen-search';
import {
  runStandardImport,
  type ScrapedStandard,
  type StandardScrapeResult,
} from './lib/safe-standard-import';

/** Status codes the form's checkbox group offers, for splitting a capped committee. */
const STATUS_CODES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

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
    value === 'registered'
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

function slugify(reference: string): string {
  const stem = reference
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `cen-${stem || 'standard'}`;
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
    slug: slugify(reference),
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

async function scrape(): Promise<StandardScrapeResult> {
  const committees = await listCommitteeCodes();
  console.log(`${committees.length} technical committees to walk`);

  const byReference = new Map<string, ScrapedStandard>();
  const fetchFailures: string[] = [];
  const stillCapped: string[] = [];
  const unmappedStatuses = new Map<string, number>();

  let done = 0;
  for (const committee of committees) {
    done += 1;
    try {
      let result = await search({ tcCode: committee.value });

      // A committee at the ceiling is missing rows. Split it by status, which
      // partitions the same set without overlapping.
      if (result.capped) {
        console.log(`  ${committee.label} hit the cap — splitting by status`);
        const rows: CenRow[] = [];
        let anyStillCapped = false;
        for (const status of STATUS_CODES) {
          await sleep(DELAY_MS);
          const part = await search({ tcCode: committee.value, statuses: [status] });
          rows.push(...part.rows);
          if (part.capped) anyStillCapped = true;
        }
        if (anyStillCapped) stillCapped.push(committee.label);
        result = { rows, capped: anyStillCapped };
      }

      for (const row of result.rows) {
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
      `INCOMPLETE: ${stillCapped.length} committee(s) still at the 1 000-row cap after ` +
        `splitting by status — ${stillCapped.join(', ')}`,
    );
  }

  console.log(
    `${byReference.size.toLocaleString('en-GB')} distinct documents` +
      (fetchFailures.length ? `, ${fetchFailures.length} committee(s) failed` : ''),
  );

  return { records: [...byReference.values()], fetchFailures };
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
