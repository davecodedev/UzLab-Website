# Roadmap — 4-week MVP

Scope agreed: Foundation + Home, About, Membership, Media & Contact,
Publications & Resources (basic). Professional Development, Technical
Committee, Equipment, and Career ship as "coming soon" pages only — see
[ARCHITECTURE.md](ARCHITECTURE.md) for why deferring them is safe.

## Week 1 — Foundation (done)

- [x] npm workspaces monorepo (`apps/api` NestJS, `apps/web` Next.js)
- [x] Postgres schema for v1 models (Auth, Membership, Publications, News,
      Contact) + initial migration
- [x] JWT auth (register/login/refresh-rotation/logout) — verified
      end-to-end against a real Postgres, not just typechecked
- [x] Membership types (read), directory (read), application (write, auth
      required) — verified end-to-end through the actual browser UI
- [x] Publications + News (read, basic search), Contact submission
- [x] Global search skeleton (Postgres ILIKE across Publications/News/
      Members) behind a swappable `SearchService.search(q)` boundary
- [x] `docker-compose.yml` (Postgres + MinIO) for local dev
- [x] CI workflow (typecheck/build/lint on push)
- [x] `CLAUDE.md`, `ARCHITECTURE.md`, this roadmap

**Not yet done, carried into Week 2**: the app has no way for staff to
create membership types, publications, or news short of direct DB access —
that's the first thing Week 2 fixes.

## Week 2 — Admin capability + content operations

- [ ] `@Roles(UserRole.ADMIN, UserRole.STAFF)`-gated CRUD endpoints for
      MembershipType, Publication, NewsArticle
- [ ] Minimal admin UI (or, if faster: ship with `prisma studio` /
      protected API-only access for week 2, defer a real admin UI screen
      to week 3 if time is short — flag this trade-off to the team, don't
      silently drop it)
- [ ] Membership application review workflow: staff approves/rejects an
      application; approval creates the `Member` record
- [ ] Publication file upload wired to MinIO/S3 (`fileUrl` field already
      exists in the schema)
- [ ] Contact/feedback submissions visible to staff

## Week 3 — Content, search polish, deployment target

- [ ] Publications faceted filters on the web UI (category, language, tags)
- [ ] Seed real initial content (About copy, membership types, a few
      publications/news items) — coordinate with the association for actual
      copy, don't ship with placeholder Lorem ipsum
- [ ] Hosting decision made (Uzbekistan DC / cloud / VPS) — still open as of
      Week 1; this blocks writing real Dockerfiles + deploy pipeline
- [ ] Staging environment stood up, CI deploys to it on merge to `main`
- [ ] Responsive/accessibility pass on all v1 pages

## Week 4 — Hardening and launch

- [ ] Security pass: rate limiting on `/auth/*`, CORS locked to real
      origins, secrets rotated out of any dev defaults
- [ ] Error states and empty states double-checked on every v1 page
- [ ] Backup verified on the chosen Postgres hosting (not just assumed)
- [ ] Soft launch — real traffic, monitor closely, fix forward

## After MVP (not scheduled yet — sequence to be decided with the team)

Professional Development, Technical Committee, Equipment, Career — each
follows the module pattern in `CLAUDE.md` ("how to add a new module"). None
require touching the modules built in the MVP.
