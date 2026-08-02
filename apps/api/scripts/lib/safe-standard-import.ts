// The same guarded write path as the laboratory registers, for the standards
// catalogues.
//
// Separate from safe-import.ts rather than generic over both: the two entities
// share the *judgement* about whether a crawl is trustworthy — which is why
// `judge` is imported rather than copied — but nothing else. A standard has no
// region, no accreditation number and no slug the public has already bookmarked
// in the same way, and pretending otherwise would make both paths harder to
// read than having two short ones.
import type { Prisma, PrismaClient, StandardRegister } from '@prisma/client';
import { judge, DEFAULT_LIMITS, type SanityLimits } from './safe-import';
import { foldForSearch } from '../../src/common/utils/translit';

/**
 * Everything an importer writes for one document, minus what this module owns.
 * Typed against Prisma's own input so a renamed column fails the build.
 */
export type StandardPayload = Omit<
  Prisma.StandardUncheckedCreateInput,
  'id' | 'register' | 'sourceId' | 'slug' | 'searchText' | 'lastSeenAt' | 'disappearedAt'
>;

export interface ScrapedStandard {
  /** The catalogue's own id — unique within the register, not across both. */
  sourceId: string;
  /** Used only on create; an existing row keeps its published slug. */
  slug: string;
  data: StandardPayload;
}

export interface StandardScrapeResult {
  records: ScrapedStandard[];
  fetchFailures: string[];
}

export interface StandardRunOptions {
  prisma: PrismaClient;
  register: StandardRegister;
  trigger: string;
  limits?: Partial<SanityLimits>;
  force?: boolean;
}

/** How often to report progress; a full catalogue write is otherwise silent. */
const PROGRESS_EVERY = 2000;

/** Rows per createMany. Large enough to matter, small enough to stay readable. */
const CREATE_CHUNK = 500;

/** Updates in flight at once — bounded by the connection pool, not politeness. */
const UPDATE_CONCURRENCY = 20;

/**
 * Builds the folded, script-neutral key stored in `Standard.searchText`.
 *
 * Designation matters most and is deliberately included twice over: once as
 * written ("ГОСТ EN 581-1-2022") and once split on punctuation, so a reader who
 * types "GOST 581" or "581-1" finds the document either way.
 */
export function buildStandardSearchKey(
  designation: string,
  data: Pick<
    StandardPayload,
    'title' | 'abstract' | 'icsLabel' | 'category' | 'developer' | 'technicalCommittee'
  >,
): string {
  const parts = [
    designation,
    designation.replace(/[.\-/:]+/g, ' '),
    data.title,
    data.abstract,
    data.icsLabel,
    data.category,
    data.developer,
    data.technicalCommittee,
  ].filter((v): v is string => Boolean(v && String(v).trim()));

  const seen = new Set<string>();
  for (const term of foldForSearch(parts.join(' ')).split(' ')) {
    if (term) seen.add(term);
  }
  return [...seen].join(' ');
}

/**
 * Runs a scrape, judges it, and only then writes. Returns nothing; the outcome
 * is in ImportRun and on stdout.
 */
export async function runStandardImport(
  opts: StandardRunOptions,
  scrape: () => Promise<StandardScrapeResult>,
): Promise<void> {
  const { prisma, register, trigger } = opts;
  const limits: SanityLimits = {
    ...DEFAULT_LIMITS,
    // A standards catalogue carries no region, so that check never applies.
    minRegionCoverage: 0,
    ...opts.limits,
  };
  const startedAt = new Date();

  const run = await prisma.importRun.create({
    data: { standardRegister: register, trigger, status: 'FAILED', startedAt },
  });

  const finish = async (
    status: 'SUCCESS' | 'NO_CHANGES' | 'REFUSED' | 'FAILED',
    fields: Record<string, unknown>,
  ) => {
    const finishedAt = new Date();
    await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        ...fields,
      },
    });
  };

  try {
    const result = await scrape();
    const existingCount = await prisma.standard.count({
      where: { register, disappearedAt: null },
    });
    const verdict = judge(
      { records: result.records as never[], fetchFailures: result.fetchFailures },
      existingCount,
      limits,
    );

    if (!verdict.ok && !opts.force) {
      console.error(`\nREFUSED: ${verdict.reason}\nNothing was written.`);
      await finish('REFUSED', {
        scraped: result.records.length,
        fetchFailures: result.fetchFailures.length,
        message: verdict.reason,
        warnings: verdict.warnings,
      });
      process.exitCode = 1;
      return;
    }
    if (!verdict.ok && opts.force) {
      verdict.warnings.push(`Sanity check overridden by --force: ${verdict.reason}`);
    }

    const now = new Date();

    // The whole catalogue's keys in one query, so deciding insert-or-update
    // costs no round trips. A per-record `findUnique` here is what made the
    // first production import take hours: the interstate catalogue is 32 899
    // documents, and at proxy latency two queries each is most of a day.
    const existingRows = await prisma.standard.findMany({
      where: { register },
      select: { id: true, sourceId: true, disappearedAt: true },
    });
    const existing = new Map(existingRows.map((r) => [r.sourceId, r]));

    const toCreate: Prisma.StandardCreateManyInput[] = [];
    const toUpdate: { id: string; data: Prisma.StandardUpdateInput }[] = [];
    let reappeared = 0;

    for (const rec of result.records) {
      const searchText = buildStandardSearchKey(rec.data.designation, rec.data);
      const found = existing.get(rec.sourceId);

      if (found) {
        if (found.disappearedAt) reappeared++;
        // Keep the established slug — it is already in published URLs.
        toUpdate.push({
          id: found.id,
          data: { ...rec.data, searchText, lastSeenAt: now, disappearedAt: null },
        });
      } else {
        toCreate.push({
          ...rec.data,
          register,
          sourceId: rec.sourceId,
          slug: rec.slug,
          searchText,
          lastSeenAt: now,
        });
      }
    }

    for (let i = 0; i < toCreate.length; i += CREATE_CHUNK) {
      await prisma.standard.createMany({ data: toCreate.slice(i, i + CREATE_CHUNK) });
      console.log(`  created ${Math.min(i + CREATE_CHUNK, toCreate.length)}/${toCreate.length}`);
    }

    // Updates cannot be batched into one statement the way inserts can — each
    // row gets different values — so they go out concurrently instead. The
    // limit is about not opening more connections than the pool holds, not
    // about load: this work is waiting on the network, not on Postgres.
    for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
      await Promise.all(
        toUpdate
          .slice(i, i + UPDATE_CONCURRENCY)
          .map((u) => prisma.standard.update({ where: { id: u.id }, data: u.data })),
      );
      const done = Math.min(i + UPDATE_CONCURRENCY, toUpdate.length);
      if (done % PROGRESS_EVERY < UPDATE_CONCURRENCY) {
        console.log(`  updated ${done}/${toUpdate.length}`);
      }
    }

    const created = toCreate.length;
    const updated = toUpdate.length;

    // Anything in this catalogue we did not see is stamped, never deleted: a
    // withdrawn standard is still the document an old accreditation cites.
    //
    // Found by timestamp rather than by `sourceId: { notIn: [...] }`. Every row
    // written above carries exactly this run's `now`, so anything older was not
    // seen — and the interstate catalogue has 32 899 documents, which as an
    // IN-list would be a query parameter for each one.
    const gone = await prisma.standard.updateMany({
      where: {
        register,
        disappearedAt: null,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: now } }],
      },
      data: { disappearedAt: now },
    });

    const summary =
      `created ${created}, updated ${updated}, disappeared ${gone.count}` +
      (reappeared ? `, reappeared ${reappeared}` : '');
    console.log(`\n${summary}`);
    for (const w of verdict.warnings) console.warn(`  warning: ${w}`);

    await finish('SUCCESS', {
      scraped: result.records.length,
      created,
      updated,
      disappeared: gone.count,
      reappeared,
      fetchFailures: result.fetchFailures.length,
      message: summary,
      warnings: verdict.warnings,
    });
  } catch (err) {
    await finish('FAILED', { message: String(err).slice(0, 500) });
    throw err;
  }
}
