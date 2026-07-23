// Imports Uzbekistan's national accreditation registry (akkred.uz) into our
// Laboratory table. The registry's data table is rendered and paginated
// entirely client-side — navigating directly to `?page=2` returns the same
// data as `?page=1`; only clicking the actual "next page" control advances
// it (confirmed by testing both directly). So this drives a real headless
// browser (Puppeteer) and clicks through pagination within one session,
// rather than looping over URLs.
//
// Only pulls the four categories that are genuinely laboratories (as
// opposed to certification/inspection bodies, which the same registry also
// lists) — Testing, Calibration, Medical, Metrology comparison.
//
// Every record is tagged source: GOVERNMENT_IMPORT. Address/phone/email/
// website aren't available from this registry — its own per-record detail
// view is broken on their site — so those stay empty until a lab claims its
// own listing or O'zAkk provides a fuller export.
//
// Usage: npm run import:akkred --workspace=apps/api
import 'dotenv/config';
import puppeteer, { type Page } from 'puppeteer';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, LaboratoryField, AccreditationStatus } from '@prisma/client';
import { slugify } from '../src/common/utils/slugify';

const REGISTRY_URL = 'https://akkred.uz/uz/reestr';

const CATEGORIES: { typeStd: number; label: string; field: LaboratoryField }[] = [
  { typeStd: 13, label: 'Sinov laboratoriyasi (Testing)', field: LaboratoryField.TESTING },
  { typeStd: 21, label: 'Kalibrlash laboratoriyasi (Calibration)', field: LaboratoryField.METROLOGY },
  { typeStd: 19, label: 'Metrologiya qiyoslash (Metrology comparison)', field: LaboratoryField.METROLOGY },
  { typeStd: 15, label: 'Tibbiy laboratoriya (Medical)', field: LaboratoryField.MEDICINE },
];

const UZ_MONTHS: Record<string, string> = {
  yan: '01',
  fev: '02',
  mar: '03',
  apr: '04',
  may: '05',
  iyn: '06',
  iyl: '07',
  avg: '08',
  sen: '09',
  okt: '10',
  noy: '11',
  dek: '12',
};

function parseUzDate(text: string): Date | undefined {
  const match = text.trim().match(/^(\d{1,2})\s+([a-zA-Z']+)\s+(\d{4})$/);
  if (!match) return undefined;
  const [, day, monAbbr, year] = match;
  const month = UZ_MONTHS[monAbbr.toLowerCase()];
  if (!month) return undefined;
  return new Date(`${year}-${month}-${day.padStart(2, '0')}T00:00:00Z`);
}

function mapStatus(text: string): AccreditationStatus {
  const t = text.trim().toLowerCase();
  if (t.includes('amaldagi')) return AccreditationStatus.ACCREDITED;
  return AccreditationStatus.UNKNOWN;
}

interface ScrapedRow {
  registryNumber: string;
  name: string;
  accreditedFrom?: Date;
  status: AccreditationStatus;
}

async function extractRows(tab: Page): Promise<{ rows: ScrapedRow[]; total: number }> {
  const result = await tab.evaluate(() => {
    const totalText = document.body.innerText.match(/Topildi:\s*(\d+)/);
    const total = totalText ? Number(totalText[1]) : 0;

    const trs = Array.from(document.querySelectorAll('table tr'));
    const rows = trs
      .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td as HTMLElement).innerText.trim()))
      .filter((cells) => cells.length >= 5);

    return { total, rows };
  });

  const rows: ScrapedRow[] = result.rows
    .filter((cells) => cells[1] && cells[2])
    .map((cells) => ({
      registryNumber: cells[1],
      name: cells[2],
      accreditedFrom: parseUzDate(cells[3]),
      status: mapStatus(cells[4]),
    }));

  return { rows, total: result.total };
}

async function clickNextPage(tab: Page): Promise<boolean> {
  const clicked = await tab.evaluate(() => {
    const nextBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.querySelector('svg.lucide-chevron-right') && !b.hasAttribute('disabled'),
    );
    if (!nextBtn) return false;
    (nextBtn as HTMLButtonElement).click();
    return true;
  });
  if (clicked) {
    await new Promise((r) => setTimeout(r, 1200));
  }
  return clicked;
}

async function scrapeCategory(
  tab: Page,
  typeStd: number,
): Promise<ScrapedRow[]> {
  const url = `${REGISTRY_URL}?page=1&type_std=${typeStd}&status=active%2Cextended`;
  await tab.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await tab.waitForSelector('table tr', { timeout: 10000 }).catch(() => undefined);

  const first = await extractRows(tab);
  const allRows = [...first.rows];
  const seen = new Set(allRows.map((r) => r.registryNumber));

  let guard = 0;
  while (allRows.length < first.total && guard < 50) {
    guard++;
    const advanced = await clickNextPage(tab);
    if (!advanced) break;
    const { rows } = await extractRows(tab);
    const fresh = rows.filter((r) => !seen.has(r.registryNumber));
    if (fresh.length === 0) break; // pagination stalled — stop rather than loop forever
    for (const r of fresh) seen.add(r.registryNumber);
    allRows.push(...fresh);
  }

  return allRows;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const browser = await puppeteer.launch({ headless: true });

  let created = 0;
  let updated = 0;

  try {
    const tab = await browser.newPage();

    for (const category of CATEGORIES) {
      console.log(`\n${category.label} (type_std=${category.typeStd})`);
      const rows = await scrapeCategory(tab, category.typeStd);
      console.log(`  scraped ${rows.length} unique records`);

      for (const row of rows) {
        const existing = await prisma.laboratory.findUnique({
          where: { accreditationNumber: row.registryNumber },
        });

        if (existing) {
          await prisma.laboratory.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              accreditationStatus: row.status,
              accreditedUntil: row.accreditedFrom,
            },
          });
          updated++;
        } else {
          await prisma.laboratory.create({
            data: {
              name: row.name,
              slug: slugify(`${row.registryNumber}-${row.name}`),
              accreditationNumber: row.registryNumber,
              accreditationBody: "O'zbekiston akkreditatsiya markazi (O'ZAKK)",
              accreditationStatus: row.status,
              accreditedUntil: row.accreditedFrom,
              fields: [category.field],
              source: 'GOVERNMENT_IMPORT',
              isPublished: true,
            },
          });
          created++;
        }
      }
    }

    console.log(`\nDone. Created: ${created}, updated: ${updated}.`);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
