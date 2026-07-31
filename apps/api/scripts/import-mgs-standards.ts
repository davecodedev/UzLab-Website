// Imports the EASC catalogue of interstate standards (mgscatalog.by) into the
// Standard table.
//
// This is the GOST corpus — the documents most Uzbek accreditation scopes
// actually cite — published by the Interstate Council for Standardization,
// Metrology and Certification and hosted in Belarus. It is not a register of
// laboratories and not an Uzbek source; it is the reference these registers
// point at.
//
// The site is server-rendered PHP whose table is refreshed over one AJAX
// endpoint: POST script/search.ajax.php with {poisk, page}, 11 rows a page,
// ~2 991 pages. Two things about it to know:
//   * asking for a page past the end silently returns the last page again, so
//     the end is found from the published total, and every row is keyed by its
//     own id so a repeat cannot inflate the count;
//   * the per-document page carries the scope text, developer, technical
//     committee and adopting states. That is 32 899 more requests against a
//     small government host, so it is a separate, throttled pass — see
//     fetch-mgs-details.ts — and `detailFetchedAt` records who has been done.
//
// Usage: npm run import:mgs --workspace=apps/api
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, StandardRegister, StandardStatus } from '@prisma/client';
import { slugify } from '../src/common/utils/slugify';
import {
  runStandardImport,
  type ScrapedStandard,
  type StandardScrapeResult,
} from './lib/safe-standard-import';

const BASE = 'https://mgscatalog.by';
const SEARCH = `${BASE}/script/search.ajax.php`;
const ROWS_PER_PAGE = 11;
const CONCURRENCY = 4;
const RETRIES = 5;

const failedUrls: string[] = [];

async function fetchPage(page: number): Promise<string | null> {
  const body = new URLSearchParams({ poisk: ' ', page: String(page) });
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(SEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'UzLab registry importer',
        },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === RETRIES) {
        console.warn(`  page ${page} failed after ${RETRIES} attempts: ${String(err)}`);
        failedUrls.push(`${SEARCH}?page=${page}`);
        return null;
      }
      // Exponential, not linear: a crawl this long will meet a short outage,
      // and five attempts inside five seconds is not a retry policy.
      await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** (attempt - 1), 8_000)));
    }
  }
  return null;
}

function decode(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The catalogue's own wording. "Взамен" and "Введен впервые" both describe a
 * document that is in force — the first replaced something, the second did
 * not — and only "Заменен" and "Отменен" mean it no longer is. Anything
 * unrecognised stays UNKNOWN rather than being guessed into a bucket, and the
 * original wording is kept in `statusLabel` either way.
 */
function mapStatus(label: string): StandardStatus {
  const text = label.toLowerCase();
  if (text.startsWith('заменен')) return StandardStatus.SUPERSEDED;
  if (text.startsWith('отменен')) return StandardStatus.WITHDRAWN;
  if (text.startsWith('введен впервые') || text.startsWith('взамен')) {
    return StandardStatus.IN_FORCE;
  }
  return StandardStatus.UNKNOWN;
}

/** "2020-02-28 00:00:00" — the catalogue's only date format. */
function parseDate(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;
  const date = new Date(text.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The year a document is cited by — "ГОСТ EN 581-1-2022" -> 2022. */
function designationYear(designation: string): number | null {
  const match = designation.match(/[-–—:\s](\d{4})\s*$/);
  if (!match) return null;
  const year = Number(match[1]);
  return year >= 1920 && year <= 2100 ? year : null;
}

const ROW =
  /<tr>\s*<td[^>]*><a href="katalogstand_detail\.php\?UrlRN=(\d+)"[^>]*>(.*?)<\/a><\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>/gs;

function parseRows(html: string): ScrapedStandard[] {
  const out: ScrapedStandard[] = [];
  for (const m of html.matchAll(ROW)) {
    const [, sourceId, rawDesignation, rawTitle, rawStatus, rawFrom, rawUntil] = m;
    const designation = decode(rawDesignation);
    if (!designation) continue;

    const statusLabel = decode(rawStatus);
    out.push({
      sourceId,
      slug: `mgs-${slugify(designation) || 'standart'}-${sourceId}`,
      data: {
        sourceUrl: `${BASE}/katalogstand_detail.php?UrlRN=${sourceId}`,
        designation,
        title: decode(rawTitle) || designation,
        status: mapStatus(statusLabel),
        statusLabel: statusLabel || null,
        effectiveFrom: parseDate(decode(rawFrom)),
        effectiveUntil: parseDate(decode(rawUntil)),
        year: designationYear(designation),
        // The catalogue publishes only interstate standards, and says so on
        // every page rather than per row.
        category: 'ГОСТ — межгосударственные стандарты',
      },
    });
  }
  return out;
}

/** "Документов найдено: 32899" — the catalogue's own count. */
function publishedTotal(html: string): number | null {
  const match = html.match(/Документов найдено:\s*<span[^>]*>(\d+)/);
  return match ? Number(match[1]) : null;
}

async function scrape(): Promise<StandardScrapeResult> {
  const first = await fetchPage(1);
  if (!first) throw new Error('Could not fetch the first page — aborting before any write.');

  const total = publishedTotal(first);
  if (!total) throw new Error('Could not read the published document count — refusing to guess.');
  const lastPage = Math.ceil(total / ROWS_PER_PAGE);
  console.log(`mgscatalog.by: ${total} documents across ${lastPage} pages`);

  const byId = new Map<string, ScrapedStandard>();
  for (const rec of parseRows(first)) byId.set(rec.sourceId, rec);

  const pages = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
  let cursor = 0;

  const worker = async () => {
    while (cursor < pages.length) {
      const page = pages[cursor++];
      const html = await fetchPage(page);
      if (html) {
        for (const rec of parseRows(html)) byId.set(rec.sourceId, rec);
      }
      if (page % 250 === 0) console.log(`  page ${page}/${lastPage} — ${byId.size} documents`);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`scraped ${byId.size} documents (${failedUrls.length} page(s) unfetchable)`);
  return { records: [...byId.values()], fetchFailures: failedUrls };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const trigger = process.env.IMPORT_TRIGGER ?? 'manual';
  const force = process.argv.includes('--force');

  try {
    await runStandardImport({ prisma, register: StandardRegister.MGS, trigger, force }, scrape);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
