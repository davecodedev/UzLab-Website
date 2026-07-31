// Fills in the per-document fields of the interstate catalogue: scope text,
// developer, technical committee and the states that adopted each standard.
//
// Separate from the listing import on purpose. mgscatalog.by has 32 899
// documents and each detail page is its own request against a small government
// host, so this runs as a bounded, throttled pass — a batch at a time, oldest
// unfetched first — and can be stopped and resumed at any point.
// `Standard.detailFetchedAt` is the bookmark.
//
// Usage:
//   npm run fetch:mgs-details --workspace=apps/api            # one batch
//   BATCH=2000 npm run fetch:mgs-details --workspace=apps/api # a larger one
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, StandardRegister } from '@prisma/client';
import { buildStandardSearchKey } from './lib/safe-standard-import';

const BASE = 'https://mgscatalog.by';
const DEFAULT_BATCH = 500;
const CONCURRENCY = 3;
const RETRIES = 3;
/** A pause between requests per worker. The catalogue is not in a hurry. */
const THROTTLE_MS = 150;

interface Detail {
  abstract: string | null;
  category: string | null;
  statusLabel: string | null;
  developer: string | null;
  technicalCommittee: string | null;
  adoptingStates: string[];
}

function decode(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * The page is one two-column table: a bolded Russian label on the left, the
 * value on the right. Reading it by label rather than by position is what keeps
 * this working when a row is absent — and rows are absent often, since not
 * every document has a developer or a committee.
 */
function field(html: string, label: string): string | null {
  const pattern = new RegExp(
    `<b>\\s*${label}\\s*</b>\\s*</td>\\s*<td[^>]*>(.*?)</td>`,
    'is',
  );
  const value = html.match(pattern)?.[1];
  if (!value) return null;
  const text = decode(value).replace(/\n{2,}/g, '\n').trim();
  return text || null;
}

function parseDetail(html: string): Detail {
  const states = field(html, 'Присоединившиеся государства');
  return {
    abstract: field(html, 'Область применения'),
    category: field(html, 'Категория'),
    statusLabel: field(html, 'Состояние'),
    developer: field(html, 'Разработчик'),
    technicalCommittee: field(html, 'Закреплен за'),
    adoptingStates: states
      ? states
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  };
}

async function fetchDetail(sourceId: string): Promise<string | null> {
  const url = `${BASE}/katalogstand_detail.php?UrlRN=${sourceId}`;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'UzLab registry importer' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === RETRIES) {
        console.warn(`  ${sourceId}: ${String(err)}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** (attempt - 1), 8_000)));
    }
  }
  return null;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const batch = Number(process.env.BATCH ?? DEFAULT_BATCH);

  try {
    const pending = await prisma.standard.findMany({
      where: { register: StandardRegister.MGS, detailFetchedAt: null, deletedAt: null },
      select: { id: true, sourceId: true, designation: true, title: true, icsLabel: true },
      orderBy: { createdAt: 'asc' },
      take: batch,
    });

    const remaining = await prisma.standard.count({
      where: { register: StandardRegister.MGS, detailFetchedAt: null, deletedAt: null },
    });

    if (pending.length === 0) {
      console.log('Every MGS document already has its detail page. Nothing to do.');
      return;
    }
    console.log(`fetching ${pending.length} of ${remaining} outstanding detail pages`);

    let done = 0;
    let failed = 0;
    let cursor = 0;

    const worker = async () => {
      while (cursor < pending.length) {
        const row = pending[cursor++];
        const html = await fetchDetail(row.sourceId);
        if (!html) {
          failed++;
          continue;
        }

        const detail = parseDetail(html);
        await prisma.standard.update({
          where: { id: row.id },
          data: {
            ...detail,
            // Keep what the listing gave us if a field is blank here rather
            // than overwriting good data with null.
            category: detail.category ?? undefined,
            statusLabel: detail.statusLabel ?? undefined,
            detailFetchedAt: new Date(),
            searchText: buildStandardSearchKey(row.designation, {
              title: row.title,
              abstract: detail.abstract,
              icsLabel: row.icsLabel,
              category: detail.category,
              developer: detail.developer,
              technicalCommittee: detail.technicalCommittee,
            }),
          },
        });

        if (++done % 100 === 0) console.log(`  ${done}/${pending.length}`);
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    console.log(
      `\nfetched ${done}, failed ${failed}, ` +
        `${Math.max(0, remaining - done)} still outstanding`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
