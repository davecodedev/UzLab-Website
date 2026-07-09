# Architecture

## Why these choices

**TypeScript everywhere (NestJS + Next.js).** The team is 2-5 developers,
some also driving Claude Code sessions directly. One language across
frontend and backend cuts context-switching and keeps generated code
consistent. NestJS's module system (`@Module`) is the concrete mechanism
behind the "modules must stay decoupled" requirement — each business domain
(Membership, Publications, future Technical Committee, etc.) is a real,
isolated Nest module, not just a folder-naming convention.

**Modular monolith, not microservices.** A small team maintaining many
services is a maintainability tax with no payoff at this scale. Split a
module into its own service later only if a specific module's load actually
demands it — not preemptively.

**PostgreSQL as the only datastore for v1.** Relational integrity for
members/applications/equipment, JSONB where needed, full-text search
sufficient for the current content volume, and a mature backup/replication
story for the "millions of records, years of growth" horizon this platform
is meant to serve.

**Global search: Postgres now, swappable later.** Standing up a dedicated
search cluster (Typesense/Meilisearch/Elasticsearch) before there's enough
content to need it is unjustified operational overhead for a small team. The
`SearchService.search(q)` method signature is the abstraction boundary — the
query implementation inside it can change without touching any caller.

**File storage is S3-compatible from day one**, even though hosting
(Uzbekistan data-center vs. cloud vs. VPS) isn't decided yet. This keeps that
decision from blocking development — locally it's MinIO via
`docker-compose.yml`; in production it's whatever S3-compatible bucket the
eventual hosting choice provides.

**Auth is self-built (JWT + rotating refresh tokens), not a hosted vendor**
(Clerk/Auth0/etc.), for the same reason: hosting/data-residency isn't
settled, and a hosted auth vendor could conflict with a future in-country
requirement. It's a plain Nest module — swappable for Keycloak or similar
later if the team decides that's worth the operational cost.

**Containers for portability.** `docker-compose.yml` covers local dev infra
(Postgres, MinIO). Application containers aren't built yet (no target
environment decided) — that's the next infra decision, not an architecture
one; this repo's Dockerfiles-to-come won't need to change based on where
they run.

## What's deferred, and why that's safe

Technical Committee, Equipment, Career, and Professional Development exist
only as static "coming soon" pages in `apps/web` with no backend module yet.
This is a deliberate scope cut for the 1-month MVP (see
[ROADMAP.md](ROADMAP.md)) — not an oversight. Because every module boundary
(Nest module, Prisma models, a `search()` branch, a web route folder) follows
the same pattern, adding one of these later is additive: new module, new
models, one line in `app.module.ts`, one branch in `SearchService`. It does
not require touching Membership, Publications, or Auth.

## Known constraints to revisit

- **Hosting/data residency**: not decided. Revisit before the first
  production deploy — it affects where Postgres/MinIO/the app containers
  actually run, not the application code itself.
- **Prisma 7 driver adapter requirement**: `datasource.url` in
  `schema.prisma` is no longer supported (a v7 breaking change from what
  most Prisma docs/tutorials still assume as of when this was built) —
  connection config lives in `prisma.config.ts` and `PrismaClient` is
  constructed with a `@prisma/adapter-pg` adapter in
  `src/common/prisma/prisma.service.ts`. Don't "simplify" this back to a
  bare `new PrismaClient()` — it will fail to pick up `DATABASE_URL`.
- **Next.js 16**: newer than most training data / tutorials assume. Check
  `node_modules/next/dist/docs/` (bundled with the installed version) before
  relying on remembered App Router conventions if something behaves
  unexpectedly.
