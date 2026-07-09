// One-off bulk content importer — reads the UzLab_Content_Template.xlsx
// format (see content-templates/) and creates Publications, News, and
// MembershipTypes directly via Prisma.
//
// Usage: npm run import:content --workspace=apps/api -- /path/to/file.xlsx
//
// Security note: uses the `xlsx` (SheetJS) package, which has known
// high-severity advisories with no fix available (prototype pollution,
// ReDoS). Acceptable here ONLY because this script runs locally, once,
// against a file a trusted person hands over directly — it must never be
// wired up to accept untrusted/network-sourced uploads.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PublicationCategory } from '@prisma/client';
import { slugify } from '../src/common/utils/slugify';

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: "${s}"`);
  return d;
}

function parseTags(value: unknown): string[] {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function requireString(value: unknown, field: string, row: number): string {
  const s = value === undefined || value === null ? '' : String(value).trim();
  if (!s) throw new Error(`Row ${row}: missing required field "${field}"`);
  return s;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error('Usage: npm run import:content --workspace=apps/api -- /path/to/file.xlsx');
  }

  const workbook = XLSX.read(readFileSync(filePath));
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const publicationsSheet = workbook.Sheets['Publications'];
  const newsSheet = workbook.Sheets['News'];
  const membershipSheet = workbook.Sheets['Membership Types'];

  let publicationsCreated = 0;
  let newsCreated = 0;
  let membershipTypesCreated = 0;

  if (publicationsSheet) {
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(publicationsSheet);
    for (const [i, row] of rows.entries()) {
      const excelRow = i + 2;
      const title = requireString(row['Title (required)'], 'Title', excelRow);
      const category = requireString(row['Category (required)'], 'Category', excelRow) as PublicationCategory;
      if (!Object.values(PublicationCategory).includes(category)) {
        throw new Error(
          `Row ${excelRow}: invalid category "${category}" — must be COOKBOOK, LEGISLATIVE, or INTERNATIONAL_LITERATURE`,
        );
      }
      const summary = requireString(row['Summary (required)'], 'Summary', excelRow);
      const bodyText = requireString(row['Body text (required)'], 'Body text', excelRow);
      const language = String(row['Language (optional, default uz)'] ?? 'uz').trim() || 'uz';
      const tags = parseTags(row['Tags (optional, comma-separated)']);
      const author = row['Author (optional)'] ? String(row['Author (optional)']).trim() : undefined;
      const publishedAt = parseDate(row['Published date (optional, YYYY-MM-DD, blank = draft)']);

      await prisma.publication.create({
        data: { title, slug: slugify(title), category, summary, bodyText, language, tags, author, publishedAt },
      });
      publicationsCreated++;
    }
  }

  if (newsSheet) {
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(newsSheet);
    for (const [i, row] of rows.entries()) {
      const excelRow = i + 2;
      const title = requireString(row['Title (required)'], 'Title', excelRow);
      const summary = requireString(row['Summary (required)'], 'Summary', excelRow);
      const bodyText = requireString(row['Body text (required)'], 'Body text', excelRow);
      const publishedAt = parseDate(row['Published date (optional, YYYY-MM-DD, blank = draft)']);

      await prisma.newsArticle.create({
        data: { title, slug: slugify(title), summary, bodyText, publishedAt },
      });
      newsCreated++;
    }
  }

  if (membershipSheet) {
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(membershipSheet);
    for (const [i, row] of rows.entries()) {
      const excelRow = i + 2;
      const name = requireString(row['Name (required)'], 'Name', excelRow);
      const description = requireString(row['Description (required)'], 'Description', excelRow);
      const priceRaw = row['Price (required, whole amount)'];
      if (priceRaw === undefined || priceRaw === null || priceRaw === '') {
        throw new Error(`Row ${excelRow}: missing required field "Price"`);
      }
      const priceCents = Math.round(Number(priceRaw) * 100);
      if (!Number.isFinite(priceCents)) {
        throw new Error(`Row ${excelRow}: invalid price "${String(priceRaw)}"`);
      }
      const currency = String(row['Currency (optional, default UZS)'] ?? 'UZS').trim() || 'UZS';
      const durationDays = Number(row['Duration in days (required, e.g. 365)']);
      if (!Number.isFinite(durationDays) || durationDays <= 0) {
        throw new Error(`Row ${excelRow}: invalid duration in days`);
      }
      const activeRaw = String(row['Active (optional, TRUE/FALSE, default TRUE)'] ?? 'TRUE').toUpperCase();
      const isActive = activeRaw !== 'FALSE';

      await prisma.membershipType.create({
        data: { name, slug: slugify(name), description, priceCents, currency, durationDays, isActive },
      });
      membershipTypesCreated++;
    }
  }

  console.log(
    `Imported: ${publicationsCreated} publications, ${newsCreated} news articles, ${membershipTypesCreated} membership types.`,
  );
  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
