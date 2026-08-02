// Imports ISO's own catalogue metadata into the Standard table.
//
// Not a scrape. ISO publishes this as open data — a single JSONLines file on
// blob storage, refreshed daily, under the ODC Attribution License (ODC-By)
// v1.0. Attribution is a condition of that licence, not a courtesy: the
// standards catalogue UI carries the citation ISO specifies, and it must stay
// there for as long as these records do.
//
//   This work is based on the iso_deliverables_metadata dataset from ISO Open
//   Data, licensed under ODC Attribution License (ODC-By) v1.0
//
// Scope: documents ISO currently considers valid — 26 571 of the 81 212 in the
// file. The rest is history and work in progress: 29 600 withdrawn, and some
// 22 000 drafts and proposals that never became standards and cannot be cited.
// Stage codes are ISO's harmonised ones, so "in force" means 60.xx (published)
// or 90.xx (published, under periodic review).
//
// Usage: npm run import:iso --workspace=apps/api
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, StandardRegister, StandardStatus } from '@prisma/client';
import { slugify } from '../src/common/utils/slugify';
import {
  runStandardImport,
  type ScrapedStandard,
  type StandardScrapeResult,
} from './lib/safe-standard-import';

const DATA_URL =
  'https://isopublicstorageprod.blob.core.windows.net/opendata/_latest/iso_deliverables_metadata/json/iso_deliverables_metadata.jsonl';

interface IsoDeliverable {
  id: number;
  reference: string | null;
  deliverableType: string | null;
  supplementType: string | null;
  title: Record<string, string | null> | null;
  scope: Record<string, string | null> | null;
  publicationDate: string | null;
  edition: number | null;
  icsCode: string[] | null;
  ownerCommittee: string | null;
  currentStage: number | null;
  replacedBy: string | null;
  languages: string[] | null;
  pages: Record<string, number | null> | null;
}

/**
 * ISO's harmonised stage codes. Only the ones that describe a document still in
 * force are listed; anything else is filtered out before it reaches here, and
 * an unrecognised code stays UNKNOWN rather than being guessed at.
 */
const STAGE_LABELS: Record<number, string> = {
  6000: 'Publication (60.00)',
  6060: 'International Standard published (60.60)',
  9020: 'Under periodic review (90.20)',
  9060: 'Review ended (90.60)',
  9092: 'To be revised (90.92)',
  9093: 'Standard confirmed (90.93)',
  9099: 'Withdrawal proposed (90.99)',
};

/** Published, or published and under review. Both mean the document stands. */
function isInForce(stage: number | null): boolean {
  if (stage === null) return false;
  return (stage >= 6000 && stage < 6100) || (stage >= 9000 && stage < 9100);
}

/**
 * ISO ships scope text as Word-exported HTML — `<p class="MsoBodyText"
 * style="mso-layout-grid-align:none">` and so on. Only the words are wanted.
 */
function htmlToText(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

function collapse(value: string | null | undefined): string | null {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

/** "ISO 14581:2022" -> 2022. The reference always carries the year. */
function referenceYear(reference: string): number | null {
  const match = reference.match(/:(\d{4})\b/);
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1920 && year <= 2100 ? year : null;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * ISO assigns several full ICS codes per document ("21.060.10", "17.020").
 * The two-digit group of the first is stored in `icsCode` so one filter spans
 * every catalogue we hold; the full codes are kept alongside.
 */
function icsGroup(codes: string[] | null): string | null {
  const first = codes?.[0];
  if (!first) return null;
  const match = first.match(/^(\d{2})/);
  return match ? match[1] : null;
}

function toRecord(row: IsoDeliverable): ScrapedStandard | null {
  const designation = collapse(row.reference);
  if (!designation) return null;

  // English only. ISO also publishes French, but the site has no French, so
  // storing it would be data no reader could ever be shown. Every one of the
  // 26 571 in-force records has an English title, so nothing is lost.
  const title = collapse(row.title?.en);
  if (!title) return null;

  const stage = row.currentStage ?? 0;

  return {
    sourceId: String(row.id),
    slug: `iso-${slugify(designation) || 'standard'}-${row.id}`,
    data: {
      sourceUrl: `https://www.iso.org/standard/${row.id}.html`,
      designation,
      title,
      abstract: htmlToText(row.scope?.en),
      status: StandardStatus.IN_FORCE,
      statusLabel: STAGE_LABELS[stage] ?? `Stage ${stage}`,
      icsCode: icsGroup(row.icsCode),
      // Left to the ICS reference table rather than invented here: ISO
      // publishes the canonical naming for these codes as its own dataset.
      icsLabel: null,
      icsCodes: row.icsCode ?? [],
      category: row.deliverableType,
      // The metadata is English-first; French titles exist on most records but
      // the site has no French, so the English text is what gets shown.
      language: 'English',
      year: referenceYear(designation),
      pageCount: row.pages?.en ?? null,
      priceUzs: null,
      effectiveFrom: parseDate(row.publicationDate),
      effectiveUntil: null,
      technicalCommittee: collapse(row.ownerCommittee),
    },
  };
}

async function scrape(): Promise<StandardScrapeResult> {
  console.log('downloading ISO open data…');
  const res = await fetch(DATA_URL, { headers: { 'User-Agent': 'UzLab registry importer' } });
  if (!res.ok) throw new Error(`Could not download the dataset: HTTP ${res.status}`);
  const body = await res.text();

  const records: ScrapedStandard[] = [];
  let total = 0;
  let skipped = 0;

  for (const line of body.split('\n')) {
    const text = line.trim();
    if (!text) continue;
    total++;

    let row: IsoDeliverable;
    try {
      row = JSON.parse(text) as IsoDeliverable;
    } catch {
      // A single malformed line must not lose the file; the sanity gate
      // decides afterwards whether too much was lost.
      skipped++;
      continue;
    }

    if (!isInForce(row.currentStage)) continue;
    const rec = toRecord(row);
    if (rec) records.push(rec);
  }

  console.log(
    `${total.toLocaleString('en-GB')} deliverables in the file; ` +
      `${records.length.toLocaleString('en-GB')} currently in force` +
      (skipped ? ` (${skipped} unparseable line(s))` : ''),
  );
  return { records, fetchFailures: [] };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const trigger = process.env.IMPORT_TRIGGER ?? 'manual';
  const force = process.argv.includes('--force');

  try {
    await runStandardImport({ prisma, register: StandardRegister.ISO, trigger, force }, scrape);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
