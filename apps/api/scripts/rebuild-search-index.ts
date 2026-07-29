// Rebuilds Laboratory.searchText — the folded, script-neutral key that backs
// keyword search — from the fields currently in the database.
//
// Safe to re-run at any time: it derives everything and writes nothing else.
// Run it after a scope-text extraction, or after changing the folding rules in
// common/utils/translit.ts, since a rules change invalidates every stored key.
//
// Usage: npm run rebuild:search --workspace=apps/api [-- --only-missing]
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { buildSearchKey } from '../src/common/utils/search-key';

const BATCH = 200;

async function main() {
  const onlyMissing = process.argv.includes('--only-missing');
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const where = onlyMissing ? { searchText: null } : {};
    const total = await prisma.laboratory.count({ where });
    console.log(`Rebuilding search key for ${total} record(s)...`);

    let processed = 0;
    let chars = 0;
    let cursor: string | undefined;

    for (;;) {
      const batch = await prisma.laboratory.findMany({
        where,
        select: {
          id: true,
          name: true,
          legalEntityName: true,
          accreditationNumber: true,
          taxId: true,
          standard: true,
          bodyTypeLabel: true,
          accreditationBody: true,
          region: true,
          city: true,
          address: true,
          legalEntityAddress: true,
          supervisorName: true,
          description: true,
          directions: true,
          scopeText: true,
        },
        orderBy: { id: 'asc' },
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      // One statement per batch rather than per row: 3,000 sequential updates
      // over the proxy connection is minutes, this is seconds.
      await prisma.$transaction(
        batch.map((lab) => {
          const key = buildSearchKey(lab);
          chars += key.length;
          return prisma.laboratory.update({
            where: { id: lab.id },
            data: { searchText: key },
          });
        }),
      );

      processed += batch.length;
      if (processed % 1000 === 0 || processed === total) {
        console.log(`  ${processed}/${total}`);
      }
    }

    console.log(
      `\nDone. ${processed} key(s) rebuilt` +
        (processed ? `, average ${Math.round(chars / processed)} chars.` : '.'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
