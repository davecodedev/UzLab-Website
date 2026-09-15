import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * The Prisma client the import scripts should use.
 *
 * The pool options are the entire reason this exists. Railway's public
 * Postgres proxy drops a connection that has been open a long time, and it
 * does not always do it cleanly: the socket goes half-open and the client sits
 * waiting for a reply that is never coming. An import doing 26 000 sequential
 * updates then stops dead at whatever chunk it had reached and logs nothing at
 * all — no error, no exit, just silence. That is worse than crashing, because
 * a crash can be retried and a hang cannot even be noticed.
 *
 * `keepAlive` gets the kernel to probe the peer so a dead one is discovered
 * rather than assumed alive. `query_timeout` is the backstop: any single
 * statement that has not answered inside a minute is failed, which converts a
 * silent hang into an error that the chunk retry in `safe-standard-import`
 * can actually act on. Nothing these scripts run is a minute of honest work,
 * so the timeout only ever fires on a broken connection.
 *
 * Scripts that run inside Railway reach Postgres over the internal host and
 * never see any of this. It costs them nothing to have it anyway.
 */
export function importPrisma(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter });
}
