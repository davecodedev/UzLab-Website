// Imports the International Classification for Standards from ISO open data.
//
// A small reference table — 1 381 rows, three levels deep — that gives one
// canonical naming for the classification every catalogue we hold uses in its
// own wording. UZSTI and MGS publish only the top-level group and label it in
// Russian; ISO assigns full codes like "21.060.10". This is what lets the
// catalogue name them consistently.
//
// Licensed ODC-By v1.0, same as the deliverables metadata:
//
//   This work is based on the iso_ics dataset from ISO Open Data, licensed
//   under ODC Attribution License (ODC-By) v1.0
//
// Usage: npm run import:ics --workspace=apps/api
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const DATA_URL =
  'https://isopublicstorageprod.blob.core.windows.net/opendata/_latest/iso_ics/csv/ICS.csv';

/** Refuse to write if the file comes back suspiciously small. */
const MIN_ROWS = 500;

/**
 * A CSV reader for this one file: comma-separated, double-quoted, doubled
 * quotes for escaping, and no embedded newlines. Pulling in a parser for 1 381
 * rows of a file this regular would be more code than this, not less.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        cells.push(cell);
        cell = '';
      } else {
        cell += ch;
      }
    }
    cells.push(cell);
    rows.push(cells);
  }
  return rows;
}

function clean(value: string | undefined): string | null {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('downloading the ICS classification…');
    const res = await fetch(DATA_URL, { headers: { 'User-Agent': 'UzLab registry importer' } });
    if (!res.ok) throw new Error(`Could not download ICS.csv: HTTP ${res.status}`);

    // The file is served with a UTF-8 BOM, which would otherwise become part
    // of the first column name.
    const text = (await res.text()).replace(/^﻿/, '');
    const rows = parseCsv(text);
    const header = rows.shift();
    if (!header) throw new Error('ICS.csv was empty.');

    const index = (name: string) => header.findIndex((h) => h.trim() === name);
    const at = {
      identifier: index('identifier'),
      parent: index('parent'),
      titleEn: index('titleEn'),
      scopeEn: index('scopeEn'),
    };
    if (at.identifier < 0 || at.titleEn < 0) {
      throw new Error(`Unexpected columns in ICS.csv: ${header.join(', ')}`);
    }

    const records = rows
      .map((cells) => {
        const code = clean(cells[at.identifier]);
        const titleEn = clean(cells[at.titleEn]);
        if (!code || !titleEn) return null;
        return {
          code,
          parent: clean(cells[at.parent]),
          titleEn,
          scopeEn: clean(cells[at.scopeEn]),
          // "21" -> 0, "21.060" -> 1, "21.060.10" -> 2.
          level: (code.match(/\./g) ?? []).length,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (records.length < MIN_ROWS) {
      throw new Error(
        `Only ${records.length} classes parsed (expected at least ${MIN_ROWS}) — refusing to write.`,
      );
    }

    // Small enough to replace wholesale, and the classification is a snapshot
    // rather than something with its own lifecycle to preserve.
    for (const record of records) {
      await prisma.icsClass.upsert({
        where: { code: record.code },
        create: record,
        update: record,
      });
    }

    const byLevel = records.reduce<Record<number, number>>((acc, r) => {
      acc[r.level] = (acc[r.level] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `wrote ${records.length} ICS classes ` +
        `(${byLevel[0] ?? 0} groups, ${byLevel[1] ?? 0} sub-groups, ${byLevel[2] ?? 0} leaves)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
