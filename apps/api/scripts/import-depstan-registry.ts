// Imports Uzbekistan's testing-laboratory approval register
// (approval.depstan.uz) into our Laboratory table.
//
// This register is separate from O'zAkk accreditation (akkred.uz): a lab can
// hold a Depstan measurement approval, an O'zAkk accreditation, or both, under
// different numbers. Rows are tagged `register: DEPSTAN` so the two never get
// confused, and numbers ("ML.2506" vs "O'ZAK.SL.0001") never collide.
//
// Unlike akkred.uz there is no JSON API — the site is server-rendered HTML —
// so this parses pages directly. Three phases:
//   1. Region is shown nowhere on the list or detail pages; the only place it
//      exists is the region filter. So page each of the 14 region filters to
//      build a code -> region map.
//   2. Page the unfiltered list for number, name, certificate validity and
//      the status badge.
//   3. Fetch each record's detail page for INN, phone, email, website, head
//      of laboratory, legal + physical address, dates and PDF links.
//
// Certificate and scope PDFs are referenced by URL, not mirrored.
//
// Usage: npm run import:depstan --workspace=apps/api
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  LaboratoryField,
  AccreditationStatus,
  ConformityBodyType,
  NationalRegister,
} from '@prisma/client';
import { slugify } from '../src/common/utils/slugify';
import {
  recordNoChanges,
  runImport,
  type ScrapeResult,
  type ScrapedRecord,
} from './lib/safe-import';

const BASE = 'https://approval.depstan.uz';
const CONCURRENCY = 8;
const ACCREDITATION_BODY =
  "O'zbekiston Respublikasi Texnik jihatdan tartibga solish agentligi (Depstan)";

// Region filter ids, exactly as the site's own <select> lists them. Spelled to
// match the akkred.uz region titles already stored, so both registers bucket
// into the same region values.
const REGIONS: Record<number, string> = {
  1: 'Toshkent shahri',
  2: 'Toshkent viloyati',
  3: 'Andijon viloyati',
  4: "Farg'ona viloyati",
  5: 'Namangan viloyati',
  6: 'Sirdaryo viloyati',
  7: 'Samarqand viloyati',
  8: 'Qashqadaryo viloyati',
  9: 'Jizzax viloyati',
  10: 'Surxondaryo viloyati',
  11: 'Buxoro viloyati',
  12: 'Navoiy viloyati',
  13: 'Xorazm viloyati',
  14: "Qoraqalpog'iston Respublikasi",
};

// The register's own status wording. "Uzaytirilgan" (extended) and
// "Kengaytirilgan" (scope expanded) are both still-valid approvals.
const STATUS_MAP: { match: RegExp; status: AccreditationStatus }[] = [
  { match: /vaqtincha\s+to.?xtatilgan/i, status: AccreditationStatus.SUSPENDED },
  { match: /to.?xtatilgan/i, status: AccreditationStatus.WITHDRAWN },
  { match: /uzaytirilga/i, status: AccreditationStatus.ACCREDITED },
  { match: /kengaytirilgan/i, status: AccreditationStatus.ACCREDITED },
  { match: /amalda/i, status: AccreditationStatus.ACCREDITED },
];

interface ListRow {
  code: string;
  number: string;
  name: string;
  validUntil?: Date;
  statusLabel?: string;
}

interface Detail {
  name?: string;
  number?: string;
  inn?: string;
  phone?: string;
  email?: string;
  website?: string;
  supervisor?: string;
  legalAddress?: string;
  address?: string;
  regDate?: string;
  statusDate?: string;
  certificateUrl?: string;
  scopeUrl?: string;
}

// --- fetching --------------------------------------------------------------

const failedUrls: string[] = [];

// Returns '' when a page can't be fetched. Over ~2,700 requests the odd
// connection reset is expected, and losing one detail page must not throw away
// the whole crawl — failures are collected and reported at the end instead.
async function getHtml(url: string, attempt = 1): Promise<string> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'UzLab-Registry-Import/1.0' } });
    if (res.status === 404) return '';
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt >= 5) {
      failedUrls.push(url);
      console.warn(`  ! giving up on ${url}: ${String(err)}`);
      return '';
    }
    await new Promise((r) => setTimeout(r, 500 * attempt));
    return getHtml(url, attempt + 1);
  }
}

/** Run `worker` over `items` with a bounded number of in-flight requests. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

// --- parsing ---------------------------------------------------------------

function decode(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(v: string | undefined | null): string | undefined {
  const t = v?.trim();
  return t && t !== '-' ? t : undefined;
}

/** Accepts the register's two date spellings: dd-mm-yyyy and dd.mm.yyyy. */
function parseDate(v: string | undefined): Date | undefined {
  const m = v?.trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (!m) return undefined;
  const d = new Date(
    `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00Z`,
  );
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseListPage(html: string): ListRow[] {
  const rows: ListRow[] = [];
  for (const tr of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const code = tr.match(/\/show\/([a-z0-9]+)/i)?.[1];
    if (!code) continue;
    const cells = (tr.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? []).map((c) =>
      decode(c.replace(/<[^>]+>/g, ' ')),
    );
    if (cells.length < 2) continue;
    rows.push({
      code,
      number: cells[0],
      name: cells[1],
      validUntil: parseDate(cells[2]),
      statusLabel: clean(cells[3]),
    });
  }
  return rows;
}

const DETAIL_LABELS: Record<string, keyof Detail> = {
  "Sinov laboratoriyasining nomi": 'name',
  "Ro'yxatga olish raqami:": 'number',
  'INN:': 'inn',
  'Telefon nomer:': 'phone',
  'Elektron pochta manzil:': 'email',
  'Veb sayt:': 'website',
  "Laboratoriya mudirining F.I.SH:": 'supervisor',
  'Yuridik manzili:': 'legalAddress',
  'Laboratoriya joylashgan manzili:': 'address',
  "Ro'yxatdan o'tgan sanasi": 'regDate',
  'Status sanasi:': 'statusDate',
};

function parseDetailPage(html: string): Detail {
  const stripped = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, '\n');
  const lines = stripped
    .split('\n')
    .map((l) => decode(l))
    .filter(Boolean);

  const out: Detail = {};
  for (let i = 0; i < lines.length; i++) {
    const key = DETAIL_LABELS[lines[i]];
    // Values sit in the node after the label; if the next line is itself a
    // label the field is simply blank on this record.
    if (key && lines[i + 1] && !DETAIL_LABELS[lines[i + 1]]) {
      out[key] = lines[i + 1];
    }
  }
  // The route names are the reverse of what they serve, verified by extracting
  // the text of both on several records: /download_pdf/ returns the approval
  // certificate ("MA'QULLASH TO'G'RISIDA GUVOHNOMA") while
  // /download-certificate/ returns the scope ("MA'QULLASH SOHASI"). Map by what
  // the file actually is, not by what the URL is called.
  out.certificateUrl = html.match(/href="([^"]*download_pdf\/[a-z0-9]+)"/i)?.[1];
  out.scopeUrl = html.match(/href="([^"]*download-certificate\/\d+)"/)?.[1];
  return out;
}

// Pager links are HTML-escaped on filtered pages ("&amp;page=2"), so anchoring
// on "[?&]page=" silently matched only the unfiltered "?page=2" form and made
// every filtered listing look one page long. Match the bare parameter instead.
function lastPageNumber(html: string): number {
  const nums = [...html.matchAll(/page=(\d+)/g)].map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : 1;
}

/** Walk a paginated listing until no new codes appear. */
async function pageThrough(
  query: string,
  onPage: (rows: ListRow[]) => void,
): Promise<void> {
  const first = await getHtml(`${BASE}/?${query}page=1`);
  onPage(parseListPage(first));
  const last = lastPageNumber(first);
  if (last <= 1) return;

  const pages = Array.from({ length: last - 1 }, (_, i) => i + 2);
  await mapLimit(pages, CONCURRENCY, async (p) => {
    onPage(parseListPage(await getHtml(`${BASE}/?${query}page=${p}`)));
  });
}

// --- change detection ------------------------------------------------------

/**
 * A full crawl is ~2,700 requests and several minutes, which is far too much to
 * repeat when nothing upstream has moved. Page 1 is sorted newest-first, so the
 * newest registry number plus the total page count is a cheap fingerprint: if
 * both match what we already hold, the register is unchanged.
 */
async function looksUnchanged(prisma: PrismaClient): Promise<string | null> {
  const html = await getHtml(`${BASE}/?page=1`);
  if (!html) return null;

  const rows = parseListPage(html);
  const newest = rows[0]?.number;
  const pages = lastPageNumber(html);
  if (!newest) return null;

  const [known, mostRecent] = await Promise.all([
    prisma.laboratory.count({
      where: { register: NationalRegister.DEPSTAN, disappearedAt: null },
    }),
    prisma.laboratory.findFirst({
      where: { register: NationalRegister.DEPSTAN, disappearedAt: null },
      orderBy: { accreditationNumber: 'desc' },
      select: { accreditationNumber: true },
    }),
  ]);

  // 10 rows per page; the last page is partial, so allow that slack.
  const expectedPages = Math.ceil(known / 10);
  if (mostRecent?.accreditationNumber === newest && Math.abs(pages - expectedPages) <= 1) {
    return `Newest record is still ${newest} across ${pages} pages — register unchanged, skipping crawl.`;
  }
  return null;
}

// --- main ------------------------------------------------------------------

async function scrape(): Promise<ScrapeResult> {
  {
    // Phase 1 — region is only discoverable through the region filter.
    console.log('Mapping regions via the 14 region filters...');
    const regionByCode = new Map<string, string>();
    for (const [id, title] of Object.entries(REGIONS)) {
      let n = 0;
      await pageThrough(`region=${id}&`, (rows) => {
        for (const r of rows) {
          regionByCode.set(r.code, title);
          n++;
        }
      });
      console.log(`  ${title}: ${n}`);
    }

    // Phase 2 — full unfiltered listing.
    console.log('\nPaging the full register...');
    const byCode = new Map<string, ListRow>();
    await pageThrough('', (rows) => {
      for (const r of rows) byCode.set(r.code, r);
    });
    const rows = [...byCode.values()];
    console.log(`  ${rows.length} records listed`);

    const missingRegion = rows.filter((r) => !regionByCode.has(r.code)).length;
    if (missingRegion) console.log(`  (${missingRegion} without a region filter match)`);

    // Phase 3 — detail pages.
    console.log('\nFetching detail pages...');
    let done = 0;
    const details = await mapLimit(rows, CONCURRENCY, async (r) => {
      const html = await getHtml(`${BASE}/show/${r.code}`);
      if (++done % 250 === 0) console.log(`  ${done}/${rows.length}`);
      return html ? parseDetailPage(html) : {};
    });

    // Phase 4 — assemble.
    const records: ScrapedRecord[] = [];
    let withRegion = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const d = details[i];
      const number = clean(d.number) ?? clean(row.number);
      const name = clean(d.name) ?? clean(row.name);
      if (!number || !name) {
        continue;
      }

      const statusLabel = clean(row.statusLabel);
      const status =
        STATUS_MAP.find((s) => statusLabel && s.match.test(statusLabel))?.status ??
        AccreditationStatus.UNKNOWN;

      const data = {
        name,
        fields: [LaboratoryField.TESTING],
        accreditationBody: ACCREDITATION_BODY,
        accreditationStatus: status,
        accreditedUntil: row.validUntil,
        taxId: clean(d.inn),
        region: regionByCode.get(row.code),
        address: clean(d.address),
        phone: clean(d.phone),
        email: clean(d.email),
        website: clean(d.website),
        source: 'GOVERNMENT_IMPORT' as const,
        isPublished: true,

        register: NationalRegister.DEPSTAN,
        registerStatusLabel: statusLabel,
        // Every entry in this register is a testing laboratory.
        bodyType: ConformityBodyType.TESTING_LAB,
        bodyTypeLabel: 'Sinov laboratoriyasi',
        isLaboratory: true,
        externalUid: row.code,
        legalEntityAddress: clean(d.legalAddress),
        supervisorName: clean(d.supervisor),
        accreditationDate: parseDate(d.regDate),
        statusDate: parseDate(d.statusDate),
        certificateUrl: clean(d.certificateUrl),
        scopeUrl: clean(d.scopeUrl),
      };

      if (data.region) withRegion++;
      records.push({
        accreditationNumber: number,
        slug: slugify(`${number}-${name}`),
        data,
      });
    }

    return {
      records,
      fetchFailures: failedUrls,
      regionCoverage: records.length ? withRegion / records.length : 0,
    };
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const trigger = process.env.IMPORT_TRIGGER ?? 'manual';
  const force = process.argv.includes('--force');
  const skipChangeCheck = force || process.argv.includes('--full');

  try {
    if (!skipChangeCheck) {
      const unchanged = await looksUnchanged(prisma);
      if (unchanged) {
        await recordNoChanges(prisma, NationalRegister.DEPSTAN, trigger, unchanged);
        return;
      }
    }

    await runImport(
      { prisma, register: NationalRegister.DEPSTAN, trigger, force },
      scrape,
    );
    if (failedUrls.length) {
      console.warn(
        `\n${failedUrls.length} page(s) could not be fetched after retries — ` +
          `those records are imported from list data only:\n  ` +
          failedUrls.slice(0, 20).join('\n  '),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
