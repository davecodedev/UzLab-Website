// Imports the O'zbekiston Standartlar Instituti catalogue (uzsti.uz) into the
// Standard table.
//
// The site is a React app over a plain Laravel API, so there is nothing to
// parse: `/api/v1/standarts` returns every field the shop displays, including
// the Uzbek abstract. One request per page of 12, ~761 pages.
//
// Scope is the "milliy" group the site itself links to — categories 27, 28 and
// 29 (Dastlabki standart, Milliy standartlar, and, despite the group's name,
// Xalqaro va xorijiy mamlakatlarning standartlari). Category 30 is the
// interstate GOST corpus, deliberately left out: mgscatalog.by is the primary
// source for those and importing both would duplicate ~30 000 documents.
//
// Usage: npm run import:uzsti --workspace=apps/api
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, StandardRegister, StandardStatus } from '@prisma/client';
import { slugify } from '../src/common/utils/slugify';
import {
  runStandardImport,
  type ScrapedStandard,
  type StandardScrapeResult,
} from './lib/safe-standard-import';

const API = 'https://admin.uzsti.uz/api/v1/standarts';
const SITE = 'https://uzsti.uz';
/** The three categories behind /shop?group=milliy. */
const CATEGORIES = '27,28,29';
const RETRIES = 5;

interface UzstiStandard {
  id: number;
  name_standart: string | null;
  keywords: string | null;
  anotatsiya_standart: string | null;
  date_standart: number | null;
  page_standart: string | null;
  price: number | null;
  actual: number | null;
  is_active: number | null;
  actual_text: string | null;
  implementation_date: string | null;
  expires_date: string | null;
  type?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
  language?: { id: number; name: string; description: string } | null;
}

interface Page {
  data: { data: UzstiStandard[]; current_page: number; last_page: number; total: number };
}

const failedUrls: string[] = [];

async function fetchPage(page: number): Promise<Page['data'] | null> {
  const url = `${API}?categories=${CATEGORIES}&page=${page}`;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'UzLab registry importer' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as Page;
      if (!body?.data?.data) throw new Error('unexpected response shape');
      return body.data;
    } catch (err) {
      if (attempt === RETRIES) {
        // One bad page must not discard a crawl that is 700 pages in; the
        // sanity gate decides afterwards whether too many were lost.
        console.warn(`  page ${page} failed after ${RETRIES} attempts: ${String(err)}`);
        failedUrls.push(url);
        return null;
      }
      // Exponential, not linear: a crawl this long will meet a short outage,
      // and five attempts inside five seconds is not a retry policy.
      await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** (attempt - 1), 8_000)));
    }
  }
  return null;
}

function collapse(value: string | null | undefined): string | null {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

/**
 * `name_standart` runs the designation and the title together — "OʻzMSt ISO
 * 6993-4:2026 (ISO 6993-4:2006, IDT) Gazsimon yoqilgʻilarni..." — and they have
 * to be separated because the designation is what a reader searches for and
 * what an accreditation scope cites.
 *
 * Split on the year, not on `keywords`. Subtracting `keywords` looks obvious
 * and works most of the time, but that column is sometimes a semicolon-list of
 * actual keywords rather than the title, and when it does not match the tail
 * the whole 200-character string ends up as the "designation". Every
 * designation, by contrast, ends in a year — optionally followed by the
 * equivalence note in brackets.
 *
 * Uzbek writes its prefix with any of several apostrophes (' ’ ‘ ʻ `), which is
 * exactly what a character-class-based rule keeps getting wrong; anchoring on
 * the year sidesteps the question entirely.
 */
const YEAR_ANCHOR = /^\s*(.{0,90}?[:\-]\s*\d{4}(?![\d\-/])(?:\s*\([^)]*\))?)\s*(.*)$/s;
/** Pre-2000 documents are occasionally cited with a two-digit year: "O'z DSt 47:86". */
const SHORT_YEAR_ANCHOR = /^\s*(.{0,90}?:\s*\d{2}(?![\d\-/])(?:\s*\([^)]*\))?)\s*(.*)$/s;

function splitDesignation(record: UzstiStandard): { designation: string; title: string } {
  const full = collapse(record.name_standart) ?? '';
  const keywords = collapse(record.keywords) ?? '';

  for (const pattern of [YEAR_ANCHOR, SHORT_YEAR_ANCHOR]) {
    const match = full.match(pattern);
    const designation = match?.[1]?.trim();
    if (designation) {
      return { designation, title: match?.[2]?.trim() || keywords || full };
    }
  }

  // No year at all. Subtracting the title is the next best evidence we have.
  if (keywords && full.endsWith(keywords)) {
    const designation = full.slice(0, full.length - keywords.length).trim();
    if (designation) return { designation, title: keywords };
  }

  // Nothing to go on: keep the record whole rather than inventing a boundary.
  return { designation: full, title: keywords || full };
}

/** "- 75   Добыча и переработка нефти, газа..." -> code "75" + the label. */
function splitIcs(name: string | null | undefined): { code: string | null; label: string | null } {
  const text = collapse(name);
  if (!text) return { code: null, label: null };
  const match = text.match(/^-?\s*(\d{2})\s+(.*)$/);
  if (!match) return { code: null, label: text };
  return { code: match[1], label: match[2].trim() };
}

/**
 * `actual_text` is free prose in Uzbek Cyrillic — "Кучга кириш санаси
 * 09.12.2023 йилдан" and, just as often, "2023 йил 12 декабрдан". Only the
 * unambiguous numeric form is parsed; the rest stays readable in `statusLabel`
 * rather than being guessed at.
 */
function effectiveFrom(text: string | null): Date | null {
  if (!text) return null;
  const match = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  const date = new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInt(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\D+/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function toRecord(row: UzstiStandard): ScrapedStandard {
  const { designation, title } = splitDesignation(row);
  const ics = splitIcs(row.type?.name);

  return {
    sourceId: String(row.id),
    // The designation is what people cite, so it leads the URL; the id keeps it
    // unique when two documents share a designation across editions.
    slug: `uzsti-${slugify(designation) || 'standart'}-${row.id}`,
    data: {
      sourceUrl: `${SITE}/shop/${row.id}`,
      designation,
      title,
      abstract: collapse(row.anotatsiya_standart),
      // The catalogue only publishes documents that are in force; anything
      // else is absent rather than flagged, so a missing flag means unknown.
      status:
        row.actual === 1 && row.is_active === 1 ? StandardStatus.IN_FORCE : StandardStatus.UNKNOWN,
      statusLabel: collapse(row.actual_text),
      icsCode: ics.code,
      icsLabel: ics.label,
      category: collapse(row.category?.name),
      language: collapse(row.language?.description) ?? collapse(row.language?.name),
      year: row.date_standart ?? null,
      pageCount: toInt(row.page_standart),
      priceUzs: toInt(row.price),
      effectiveFrom: parseDate(row.implementation_date) ?? effectiveFrom(row.actual_text),
      effectiveUntil: parseDate(row.expires_date),
    },
  };
}

async function scrape(): Promise<StandardScrapeResult> {
  const first = await fetchPage(1);
  if (!first) throw new Error('Could not fetch the first page — aborting before any write.');

  const lastPage = first.last_page;
  console.log(`uzsti.uz: ${first.total} documents across ${lastPage} pages`);

  const byId = new Map<string, ScrapedStandard>();
  for (const row of first.data) {
    const rec = toRecord(row);
    byId.set(rec.sourceId, rec);
  }

  // Sequential on purpose. This is a small institute's server, the whole crawl
  // is well under a thousand requests, and nothing here is urgent enough to
  // justify hammering it.
  for (let page = 2; page <= lastPage; page++) {
    const body = await fetchPage(page);
    if (body) {
      for (const row of body.data) {
        const rec = toRecord(row);
        byId.set(rec.sourceId, rec);
      }
    }
    if (page % 50 === 0) console.log(`  page ${page}/${lastPage} — ${byId.size} documents`);
  }

  console.log(`scraped ${byId.size} documents (${failedUrls.length} page(s) unfetchable)`);
  return { records: [...byId.values()], fetchFailures: failedUrls };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const trigger = process.env.IMPORT_TRIGGER ?? 'manual';
  const force = process.argv.includes('--force');

  try {
    await runStandardImport(
      { prisma, register: StandardRegister.UZSTI, trigger, force },
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
