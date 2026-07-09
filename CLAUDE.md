# UzLab — instructions for Claude Code

UzLab is the digital platform for a professional association: membership,
technical committee, publications/resources, equipment catalogue, career
listings, professional development, and a cross-module global search. Built
from scratch, designed to keep growing for years — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full rationale and
[docs/ROADMAP.md](docs/ROADMAP.md) for the phased build plan.

## Stack

- **Monorepo**: npm workspaces (`apps/api`, `apps/web`), no extra tooling
  (Turborepo etc.) until the number of packages actually justifies it.
- **API**: NestJS (`apps/api`) — TypeScript, modular monolith. Each business
  domain is its own Nest module under `src/modules/*`; modules talk to each
  other only through exported services, never by reaching into another
  module's controllers/DTOs directly.
- **DB**: PostgreSQL via Prisma (`prisma-client-js` generator, output to the
  default `node_modules/@prisma/client` — do not add a custom `output` path,
  it breaks once `nest build` puts compiled files under `dist/` at a
  different relative depth than `src/`). Connects via `@prisma/adapter-pg`
  (Prisma 7 requires a driver adapter — see `prisma.config.ts` and
  `src/common/prisma/prisma.service.ts`).
- **Web**: Next.js App Router (`apps/web`) — Server Components fetch from the
  API by default; Client Components (`"use client"`) only where interactivity
  is required (forms, the search box).
- **Auth**: JWT access token (15m) + rotating refresh token (30d, hashed at
  rest in the `RefreshToken` table). No session cookie. `JwtAuthGuard` is
  applied per-route with `@UseGuards`, never globally — most content routes
  are public. `RolesGuard` *is* global but is a no-op unless a route carries
  `@Roles(...)`.
- **File storage**: S3-compatible (MinIO locally via `docker-compose.yml`,
  a real S3-compatible bucket in prod) — never local disk.
- **Search**: v1 is direct Postgres `ILIKE` queries fanned out per content
  type in `SearchService` (`apps/api/src/modules/search`). This is
  intentionally simple; if/when volume demands it, swap the query layer for
  Typesense/Meilisearch behind the same `search(q)` method signature so
  callers don't change.

## Running locally

```bash
docker compose up -d          # Postgres + MinIO
npm install
cp .env.example apps/api/.env # then fill in real values
npm run prisma:migrate        # apps/api: applies prisma/migrations
npm run dev:api                # http://localhost:4000/api
npm run dev:web                # http://localhost:3000
```

`apps/web/.env.local` needs `NEXT_PUBLIC_API_URL=http://localhost:4000`.

## Module boundaries — how to add a new module

This is the pattern the "don't tightly couple modules" requirement maps to
in code. To add a new business module (e.g. Technical Committee, Equipment):

1. `apps/api/src/modules/<name>/` — `<name>.module.ts`, `.controller.ts`,
   `.service.ts`, `dto/`. Add models to `prisma/schema.prisma`, run
   `prisma migrate dev --name <description>`.
2. Register the module in `app.module.ts`.
3. If the module should be globally searchable, add one branch to
   `SearchService.search()` — don't build a separate search path.
4. `apps/web/src/app/<name>/` for the corresponding pages.
5. Never import another module's `.service.ts` file directly by path reach-
   around — only import what that module explicitly `exports` from its
   `*.module.ts`.

Deferred modules (Technical Committee, Equipment, Career, Professional
Development) currently exist only as "coming soon" pages in
`apps/web/src/app/*` with no backend — see ROADMAP.md for when each is
built out.

## Conventions

- TypeScript strict mode, no `any` without a comment explaining why it was
  unavoidable (see `JwtSignOptions` cast in `auth.service.ts` for an example
  of a justified one — upstream type is wrong, not us).
- DTOs use `class-validator` decorators; the global `ValidationPipe` is
  `whitelist: true, forbidNonWhitelisted: true` — unlisted fields are
  rejected, not silently dropped.
- Soft deletes (`deletedAt`) on content tables that need history/recovery
  (Publication, NewsArticle, User) — never hard-delete those rows.
- No comments explaining *what* code does; only *why*, for non-obvious
  constraints.

## Before calling anything done

Run the actual flow, don't just typecheck:
```bash
npm run typecheck   # both apps
npm run build       # both apps
```
Then boot the app and drive the feature (register/login, submit a form,
etc.) — through the browser for `apps/web`, via curl/`apps/api` directly for
API-only changes. Typecheck passing is not the same as the feature working.
