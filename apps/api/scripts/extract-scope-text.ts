// Extracts the text of each laboratory's scope-of-accreditation PDF into
// `scopeText`, so keyword search can reach the actual content — test methods,
// standards, product categories — rather than only the organisation's name.
//
// Only the scope document is fetched. The certificate is deliberately skipped:
// it is a ~3 KB page whose entire content (name, registry number, dates,
// issuing body) already exists as structured, searchable columns, so indexing
// it would double the crawl and add nothing findable.
//
// akkred.uz already supplies scope text through its API, so in practice this
// fills in the Depstan half of the register (~2,300 PDFs, ~174 KB each).
//
// Idempotent: records that already have scopeText are skipped unless --force.
// Usage: npm run extract:scopes --workspace=apps/api [-- --force] [-- --limit=50]
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const CONCURRENCY = 6;
/** Below this, a "PDF" is almost certainly an error page rather than a document. */
const MIN_PDF_BYTES = 1000;

interface Target {
  id: string;
  accreditationNumber: string | null;
  scopeUrl: string;
}

async function fetchPdf(url: string, attempt = 1): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'UzLab-Registry-Import/1.0' },
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_PDF_BYTES) return null;
    // Guard against an HTML error page served with a 200.
    if (!buf.subarray(0, 5).toString('latin1').startsWith('%PDF')) return null;
    return buf;
  } catch (err) {
    if (attempt >= 4) {
      console.warn(`  ! ${url}: ${String(err)}`);
      return null;
    }
    await new Promise((r) => setTimeout(r, 600 * attempt));
    return fetchPdf(url, attempt + 1);
  }
}

/** Collapses the whitespace PDF extraction leaves behind, without losing line structure. */
function tidy(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= items.length) return;
        await worker(items[i], i);
      }
    }),
  );
}

async function main() {
  const force = process.argv.includes('--force');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // pdf-parse v2 exports a PDFParse class rather than the v1 `pdf()` function.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require('pdf-parse') as {
    PDFParse: new (opts: { data: Buffer }) => {
      getText(): Promise<{ text?: string }>;
      destroy?(): Promise<void>;
    };
  };

  const extractText = async (data: Buffer): Promise<string> => {
    const parser = new PDFParse({ data });
    try {
      const { text } = await parser.getText();
      return text ?? '';
    } finally {
      // Each parser holds a worker; leaking them across ~2,300 documents would
      // exhaust memory long before the crawl finished.
      await parser.destroy?.();
    }
  };

  try {
    const targets = (await prisma.laboratory.findMany({
      where: {
        scopeUrl: { not: null },
        deletedAt: null,
        ...(force ? {} : { scopeText: null }),
      },
      select: { id: true, accreditationNumber: true, scopeUrl: true },
      orderBy: { accreditationNumber: 'asc' },
      ...(limit ? { take: limit } : {}),
    })) as Target[];

    console.log(`${targets.length} record(s) need scope text.`);
    if (targets.length === 0) return;

    let done = 0;
    let extracted = 0;
    let empty = 0;
    let failed = 0;
    let chars = 0;

    await mapLimit(targets, CONCURRENCY, async (t) => {
      const buf = await fetchPdf(t.scopeUrl);
      if (!buf) {
        failed++;
      } else {
        try {
          const text = tidy(await extractText(buf));
          if (text.length > 0) {
            await prisma.laboratory.update({
              where: { id: t.id },
              data: { scopeText: text },
            });
            extracted++;
            chars += text.length;
          } else {
            // A PDF with no text layer would need OCR; sampling showed these
            // documents do have one, so this should stay near zero.
            empty++;
          }
        } catch (err) {
          console.warn(`  ! parse ${t.accreditationNumber}: ${String(err).slice(0, 120)}`);
          failed++;
        }
      }
      if (++done % 100 === 0) {
        console.log(`  ${done}/${targets.length}  extracted ${extracted}, empty ${empty}, failed ${failed}`);
      }
    });

    console.log(
      `\nDone. Extracted ${extracted}, no text layer ${empty}, failed ${failed}.` +
        (extracted ? `\nAverage ${Math.round(chars / extracted).toLocaleString()} chars per document.` : ''),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
