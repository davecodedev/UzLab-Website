# Roadmap — 4-week MVP

Scope agreed: Foundation + Home, About, Membership, Media & Contact,
Publications & Resources, and a faceted global search. Professional
Development, Technical Committee, Equipment, and Career ship as "coming
soon" pages only — see [ARCHITECTURE.md](ARCHITECTURE.md) for why deferring
them is safe.

**Team assumption**: 2-5 developers. Each week below is split into tracks
(Backend / Frontend / Content-Ops) that run in parallel — a solo developer
runs them sequentially in the order listed instead. Adjust day counts to
your actual headcount; the *sequence and dependencies* between tasks are
what matters, not the literal day numbers.

**Standing practices** (apply every week, not repeated below):
- Short daily check-in — what shipped yesterday, what's blocked.
- Every change goes through the verification step in `CLAUDE.md` ("before
  calling anything done") before merge — typecheck, build, and actually
  drive the feature, not just review the diff.
- Merge to `main` in small slices through the week, not one big Friday merge.

---

## Week 1 — Foundation (done)

| Track | Delivered |
|---|---|
| Backend | npm workspaces monorepo, Postgres schema + migration for v1 models (Auth, Membership, Publications, News, Contact), JWT auth (register/login/refresh-rotation/logout) |
| Backend | Global search — **now faceted**, ahead of original plan: type/category/language/author/tags/date filters, independent of keyword (see below) |
| Frontend | All v1 pages per the sitemap, membership application flow, login/register |
| Infra | `docker-compose.yml` (Postgres + MinIO), GitHub Actions CI (typecheck/build/lint) |
| Docs | `CLAUDE.md`, `ARCHITECTURE.md`, this roadmap |

Verified end-to-end, not just typechecked: register → login-gated redirect
→ membership application → confirmed in the database, through the actual
browser UI. Search filters verified against seeded data across all filter
combinations.

**Carried into Week 2**: staff have no way to create membership types,
publications, or news short of direct DB access. That's Week 2's first job.

---

## Week 2 — Admin capability + content operations (done, one item carried forward)

**Goal**: staff can run the site without a developer touching the database.

**Delivered**:
- Role-gated (`ADMIN`/`STAFF`) CRUD for `MembershipType`, `Publication`,
  `NewsArticle`, with a bootstrap seed script (`npm run seed:admin`,
  idempotent — safe to run on every deploy)
- Membership application review — approve creates the `Member` record and
  upgrades the applicant's role in one transaction; reject just records the
  decision; double-approval is blocked. Verified end-to-end.
- Contact/feedback submissions: staff-only list + status updates
- Minimal admin UI (`/admin/*`): role-gated layout, list+create for each
  content type, application review screen, contact inbox — verified live
  in the browser, not just via curl

**Two real bugs found and fixed while building this** (see git history for
detail): a global `RolesGuard` that ran before `JwtAuthGuard` and made every
role-gated route unconditionally 403; and Publications/News having no
draft/published distinction on public read paths, so unpublished drafts
were publicly visible. Both are the kind of bug that only surfaces when you
actually exercise the endpoint end-to-end, not when you read the code —
worth remembering as a reason the verification step in CLAUDE.md isn't
optional.

**Not done, carried into Week 3**: Publication file upload to MinIO/S3
(`fileUrl` field exists in the schema but nothing writes to it yet, and
there's no upload UI). Applicant email notification on
approval/rejection — no transactional email provider chosen yet.

**Exit criteria for Week 2**:
- [x] An admin can log in and create a membership type, a publication, and
      a news article without touching the database.
- [x] An admin can approve a pending membership application and the
      applicant becomes a listed `Member`.
- [ ] A publication with an uploaded file downloads correctly from the
      public site. — **carried to Week 3**
- [x] Contact/feedback submissions are visible to staff.

---

## Week 3 — Content, hosting, staging

**Goal**: real content in front of a real (if not yet public) URL.

**Day 1 — blocking, do first**: hosting decision finalized with
stakeholders (Uzbekistan data center vs. cloud vs. VPS). Everything else
this week depends on it. If it's not resolved by end of Day 1, escalate —
don't let the team sit idle waiting on it.

**Backend/Infra track**
- Day 1 (parallel with the hosting conversation): finish the carried-over
  Week 2 item — publication file upload wired to MinIO/S3, and applicant
  notification email on membership approval/rejection (pick a
  transactional email provider now, this blocks both).
- Day 2: Dockerfiles for `apps/api` and `apps/web` (multi-stage, matching
  whatever base image the chosen hosting expects).
- Day 3: CI extended — build + push images on merge to `main`, deploy to a
  staging environment automatically. Real Postgres + object storage
  provisioned on the chosen host (not the local dev containers).
- Day 4-5: buffer — first real deploy always surfaces at least one
  environment-specific issue (env vars, migrations-on-deploy, CORS origin).

**Content-Ops track** (can start Day 1, doesn't block on hosting)
- Day 1-3: Seed real initial content *with the association*, not
  placeholder text — About page copy, actual membership types and pricing,
  first batch of real publications/news. This needs their input; start the
  conversation Day 1 so it's not a Day 5 scramble.
- Day 4-5: Responsive pass (mobile breakpoints on every v1 page) and a
  basic accessibility pass (contrast, keyboard navigation, alt text on
  images, form labels — already mostly in place from Week 1, this is a
  verification pass, not a rebuild).

**Exit criteria for Week 3**:
- [ ] Staging environment reachable at a real URL, running the actual
      Dockerized build (not `npm run dev`).
- [ ] Populated with real association content, not Lorem ipsum.
- [ ] Usable on a mobile viewport for every v1 page.

---

## Week 4 — Hardening and launch

**Goal**: ready for real traffic.

**Day 1 — Security pass**
- Rate limit `/api/auth/*` (register/login/refresh) — brute-force is the
  obvious risk on a fresh public auth endpoint.
- Lock CORS to the real production origin (currently defaults to
  `localhost:3000`).
- Rotate every dev-default secret (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
  MinIO/S3 credentials) to real generated values in the production
  environment — confirm none of the `.env.example` defaults made it into a
  real deploy.
- Re-check `ValidationPipe`'s `forbidNonWhitelisted` is still catching
  unexpected fields on every DTO added since Week 1.

**Day 2 — Error/empty-state audit**
- Every page that calls the API currently swallows failures into an empty
  list (`catch { return [] }`) — fine for "no content yet," silently wrong
  for "the API is down." Decide, page by page, whether that's acceptable
  for launch or needs a visible error state, and fix the ones that need it.
- Walk every v1 flow (register, login, apply for membership, submit
  contact form, search with every filter combination) checking 401/404/500
  responses render something sensible, not a blank page.

**Day 3 — Backup verification**
- Actually take a backup on the chosen Postgres hosting and *restore it
  somewhere* to confirm it works. "Backups are enabled" and "backups
  restore" are different claims — only ship having verified the second one.

**Day 4 — Performance smoke check + full regression**
- Nothing elaborate: confirm key pages (home, search with filters,
  publications list) respond reasonably under a handful of concurrent
  requests. This is a sanity check, not a load-testing exercise — real load
  testing is a post-launch concern once there's real traffic data.
- Full manual walkthrough of every v1 flow end to end, on staging, as if
  you were a first-time visitor.

**Day 5 — Soft launch**
- Go live. Monitor closely for the first 24-48 hours. Fix forward — don't
  let small issues pile up unaddressed while chasing a "perfect" state.

**Exit criteria for Week 4 / launch readiness**:
- [ ] Auth endpoints rate-limited, CORS locked down, no dev secrets in prod.
- [ ] Every v1 flow's error states checked, not just the happy path.
- [ ] A real backup has been restored successfully at least once.
- [ ] Soft launch complete, monitoring in place.

---

## After MVP (not scheduled yet — sequence to be decided with the team)

Professional Development, Technical Committee, Equipment, Career — each
follows the module pattern in `CLAUDE.md` ("how to add a new module"). None
require touching the modules built in the MVP. Likely next up: Professional
Development (closest in shape to Publications — mostly content + listings)
and Equipment (catalogue + specs, defer the RFP module further).
