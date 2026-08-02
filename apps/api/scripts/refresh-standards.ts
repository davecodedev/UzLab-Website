// The scheduled refresh for both standards catalogues, in one process.
//
// One process rather than two Railway cron services because the project is on
// the free plan and cannot provision more of them. That is the only reason: if
// the plan is ever upgraded, split this back into `import:uzsti` and
// `import:mgs` services with their own schedules and delete this file.
//
// Cadence, matching what the provenance block tells readers:
//   * UZSTI daily — 761 quick JSON pages.
//   * MGS weekly — 2 990 pages against a host that answers in 5-40 seconds, so
//     over an hour of crawling. Sunday by default (UTC, as Railway cron runs).
//   * One bounded batch of MGS detail pages every day. There are 32 899 of them
//     at ~5s each; they fill in over weeks rather than in one pass, and doing a
//     little every night is the only version of this that is polite to a small
//     government server.
//
// Every step is attempted even if an earlier one fails — a broken UZSTI crawl
// must not silently stop the MGS one — and each records its own ImportRun, so
// /admin/imports stays the place where failures are visible.
//
// Usage: npm run refresh:standards --workspace=apps/api
import 'dotenv/config';
import { spawnSync } from 'child_process';

/** UTC day-of-week for the full MGS crawl. 0 = Sunday. */
const MGS_CRAWL_DAY = Number(process.env.MGS_CRAWL_DAY ?? 0);
/** Detail pages per nightly run. Deliberately small. */
const MGS_DETAIL_BATCH = process.env.MGS_DETAIL_BATCH ?? '300';

interface Step {
  name: string;
  script: string;
  env?: Record<string, string>;
}

function run(step: Step): boolean {
  console.log(`\n=== ${step.name} ===`);
  const result = spawnSync(
    'npx',
    ['ts-node', '--project', 'tsconfig.scripts.json', '--transpile-only', step.script],
    { stdio: 'inherit', env: { ...process.env, ...step.env } },
  );

  if (result.error) {
    console.error(`${step.name} could not start: ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    console.error(`${step.name} exited with code ${result.status}`);
    return false;
  }
  return true;
}

function main() {
  const today = new Date().getUTCDay();
  const steps: Step[] = [{ name: 'UZSTI catalogue', script: 'scripts/import-uzsti-standards.ts' }];

  if (today === MGS_CRAWL_DAY) {
    steps.push({ name: 'MGS catalogue', script: 'scripts/import-mgs-standards.ts' });
  } else {
    console.log(
      `MGS full crawl runs on UTC day ${MGS_CRAWL_DAY}; today is ${today}, so only the detail batch runs.`,
    );
  }

  steps.push({
    name: `MGS detail pages (batch of ${MGS_DETAIL_BATCH})`,
    script: 'scripts/fetch-mgs-details.ts',
    env: { BATCH: MGS_DETAIL_BATCH },
  });

  const failed = steps.filter((step) => !run(step)).map((s) => s.name);

  if (failed.length) {
    console.error(`\nFailed: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll standards steps completed.');
}

main();
