// Shared machinery for the scheduled register refreshes.
//
// The importers themselves only know how to scrape. Everything that decides
// whether a scrape is trustworthy enough to write lives here, because the
// dangerous failure is not a crawl that errors out — it is a crawl that
// "succeeds" while returning plausible-but-wrong data. Both of those have
// already happened once: a pagination regex silently returned 10 records per
// region instead of 500, and a single connection reset discarded a crawl that
// was 1,250 pages in.
//
// So a run must clear explicit thresholds before a single row is written, and
// every run — including the refusals — is recorded in ImportRun.
import type { NationalRegister, Prisma, PrismaClient } from '@prisma/client';

/**
 * Everything an importer writes for one record, minus the fields this module
 * owns. Typed against Prisma's own input so a renamed column fails the build
 * rather than silently dropping data at runtime.
 */
export type LaboratoryPayload = Omit<
  Prisma.LaboratoryUncheckedCreateInput,
  'id' | 'accreditationNumber' | 'slug' | 'lastSeenAt' | 'disappearedAt'
>;

export interface ScrapedRecord {
  /** Unique key within the register — the registry number. */
  accreditationNumber: string;
  /** Everything to write, minus the number and slug. */
  data: LaboratoryPayload;
  /** Used only when creating; existing rows keep their published slug. */
  slug: string;
}

export interface ScrapeResult {
  records: ScrapedRecord[];
  /** URLs that could not be fetched after retries. */
  fetchFailures: string[];
  /** Fraction of records carrying a region, for coverage checks. */
  regionCoverage?: number;
}

export interface SanityLimits {
  /**
   * Refuse if the scrape returns fewer than this fraction of what we already
   * hold for the register. Catches truncated pagination and partial crawls —
   * the exact shape of the bug that made every region return one page.
   */
  minRecordRatio: number;
  /** Refuse below this absolute count, guarding the first-import case. */
  minRecords: number;
  /** Refuse if fewer than this fraction of records carry a region. */
  minRegionCoverage: number;
  /** Refuse if more than this fraction of pages failed to fetch. */
  maxFetchFailureRatio: number;
}

export const DEFAULT_LIMITS: SanityLimits = {
  minRecordRatio: 0.9,
  minRecords: 50,
  minRegionCoverage: 0.9,
  maxFetchFailureRatio: 0.05,
};

export interface RunOptions {
  prisma: PrismaClient;
  register: NationalRegister;
  trigger: string;
  limits?: Partial<SanityLimits>;
  /** Skip threshold enforcement — for a deliberate first-time seed. */
  force?: boolean;
}

interface Verdict {
  ok: boolean;
  reason?: string;
  warnings: string[];
}

function judge(
  result: ScrapeResult,
  existingCount: number,
  limits: SanityLimits,
): Verdict {
  const warnings: string[] = [];
  const n = result.records.length;

  if (n < limits.minRecords) {
    return { ok: false, reason: `Only ${n} records scraped (minimum ${limits.minRecords}).`, warnings };
  }

  // The key check: a healthy register grows or holds steady. A sudden collapse
  // means the scraper broke, not that the agency deleted half its labs.
  if (existingCount > 0) {
    const ratio = n / existingCount;
    if (ratio < limits.minRecordRatio) {
      return {
        ok: false,
        reason:
          `Scraped ${n} records but ${existingCount} are on file ` +
          `(${(ratio * 100).toFixed(1)}% — refusing below ${(limits.minRecordRatio * 100).toFixed(0)}%).`,
        warnings,
      };
    }
    if (ratio < 1) {
      warnings.push(`Record count fell from ${existingCount} to ${n}.`);
    }
  }

  if (result.regionCoverage !== undefined && result.regionCoverage < limits.minRegionCoverage) {
    return {
      ok: false,
      reason:
        `Only ${(result.regionCoverage * 100).toFixed(1)}% of records carry a region ` +
        `(minimum ${(limits.minRegionCoverage * 100).toFixed(0)}%) — the region filters likely stopped paginating.`,
      warnings,
    };
  }

  const failureRatio = result.fetchFailures.length / Math.max(n, 1);
  if (failureRatio > limits.maxFetchFailureRatio) {
    return {
      ok: false,
      reason:
        `${result.fetchFailures.length} pages failed to fetch ` +
        `(${(failureRatio * 100).toFixed(1)}% — refusing above ${(limits.maxFetchFailureRatio * 100).toFixed(0)}%).`,
      warnings,
    };
  }
  if (result.fetchFailures.length) {
    warnings.push(
      `${result.fetchFailures.length} page(s) unfetchable; those records kept their previous values.`,
    );
  }

  return { ok: true, warnings };
}

/**
 * Runs a scrape, judges it, and only then writes. Returns the ImportRun id.
 * `scrape` is invoked before any database mutation, so a refusal costs nothing
 * but time.
 */
export async function runImport(
  opts: RunOptions,
  scrape: () => Promise<ScrapeResult>,
): Promise<void> {
  const { prisma, register, trigger } = opts;
  const limits = { ...DEFAULT_LIMITS, ...opts.limits };
  const startedAt = new Date();

  const run = await prisma.importRun.create({
    data: { register, trigger, status: 'FAILED', startedAt },
  });

  const finish = async (
    status: 'SUCCESS' | 'NO_CHANGES' | 'REFUSED' | 'FAILED',
    fields: Record<string, unknown>,
  ) => {
    const finishedAt = new Date();
    await prisma.importRun.update({
      where: { id: run.id },
      data: { status, finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime(), ...fields },
    });
  };

  try {
    const result = await scrape();
    const existingCount = await prisma.laboratory.count({
      where: { register, disappearedAt: null },
    });
    const verdict = judge(result, existingCount, limits);

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

    // Write.
    const now = new Date();
    let created = 0;
    let updated = 0;
    let reappeared = 0;

    for (const rec of result.records) {
      const existing = await prisma.laboratory.findUnique({
        where: { accreditationNumber: rec.accreditationNumber },
        select: { id: true, disappearedAt: true },
      });

      if (existing) {
        if (existing.disappearedAt) reappeared++;
        await prisma.laboratory.update({
          where: { id: existing.id },
          // Keep the established slug — it is already in published URLs.
          data: { ...rec.data, lastSeenAt: now, disappearedAt: null },
        });
        updated++;
      } else {
        await prisma.laboratory.create({
          data: {
            ...rec.data,
            accreditationNumber: rec.accreditationNumber,
            slug: rec.slug,
            lastSeenAt: now,
          },
        });
        created++;
      }
    }

    // Anything in this register we did not see this run has gone from the
    // source. Stamp it rather than deleting: the data stays queryable and a
    // future run can clear the flag if it comes back.
    const seen = result.records.map((r) => r.accreditationNumber);
    const gone = await prisma.laboratory.updateMany({
      where: {
        register,
        disappearedAt: null,
        accreditationNumber: { notIn: seen },
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

/** Records a run that did no work because the source was unchanged. */
export async function recordNoChanges(
  prisma: PrismaClient,
  register: NationalRegister,
  trigger: string,
  message: string,
): Promise<void> {
  const now = new Date();
  await prisma.importRun.create({
    data: {
      register,
      trigger,
      status: 'NO_CHANGES',
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      message,
    },
  });
  console.log(message);
}
