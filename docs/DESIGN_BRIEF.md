# UzLab Website — Design Concept Brief

*Prompt for Claude Design. Full-site concept, no external style references — direction should
derive from the brand mark and the association's professional/technical character.*

---

## 1. Who this is for

**UzLab (Ассоциация Лабораторий Узбекистана / Association of Laboratories of Uzbekistan)** is a
professional association for testing, measurement, metrology, and research laboratories in
Uzbekistan — government and private labs, industrial QC departments, metrology services,
research institutes, and individual scientists/specialists in the field.

Its stated mission: developing laboratory practice in Uzbekistan through international standards,
professional training, and cooperation to improve research quality. Four concrete goals it
organizes around:
- An information/communication platform for labs to share experience and innovation
- Organizing staff training, seminars, and professional-development courses
- International cooperation with foreign laboratory associations and specialists
- Participating in improving the regulatory/technical documentation governing lab operations

**Audiences the site serves, distinctly:**
1. Existing member labs and their staff — need self-service (directory, courses, resources)
2. Prospective members — need to understand value and apply
3. Job seekers and employers in the lab/testing sector — a two-sided listing, not just brochureware
4. Researchers/regulators looking up a specific standard, method, or publication — search-first intent
5. General public/press — news, contact, credibility signals

**Language**: the site must work in Russian, Uzbek, and English — this isn't optional, and the
design needs to accommodate a language switcher gracefully (Cyrillic + Latin text at every size,
no layouts that only work for short English strings).

---

## 2. The brand mark

Logo: "UzLab" wordmark. "Uz" in a dark navy, geometric sans-serif; the "L" of "Lab" rendered as a
bold diagonal slash that visually connects into "ab" in a brighter, more saturated blue. Subtle
drop shadow. Reads as precise/technical without being cold. Use this mark as the anchor for the
whole palette — dark navy + a confident blue accent, on a light/white base — rather than
introducing unrelated brand colors.

---

## 3. What exists today, and why this concept needs to be better than it

The current live site (uzlab.org) has the *right* information architecture already — its nav
covers About (Mission/Goals/Leadership/Charter), Membership (Types/Directory/Application),
Professional Development (Courses/Seminars), Publications (Cookbook/Legislative Acts/
International Literature), Career (Job Seeker/Employer), News, and Contact. Visually it's a
clean, light, blue-gray site with blurred generic lab-photography hero imagery.

**The actual problem: every single one of those nav links 404s.** We tested each one directly.
The entire live site is one working homepage — About, Membership, Professional Development,
News, and Contact are all dead ends. So "make it better" here is not primarily a skin-deep
aesthetic ask: the bar is a site where **every navigation item leads to a real, useful page**,
where members have a reason to come back (fresh content, self-service tools, working search),
not just a static brochure that happens to look fine on the homepage.

We've already rebuilt the underlying application (Next.js + a real backend) with working pages
for every section, a faceted global search (filter by content type, category, language, author,
tags, date), and a light theme anchored on the logo's navy/blue. This design concept should
either validate and elevate that direction, or make the case for something better — not treat the
current build as fixed.

---

## 4. Full sitemap to design for

- **Home** — hero, mission snapshot, latest news, upcoming events, clear paths into the sections
  below (not just a wall of links)
- **About Us** — Mission, Goals, Leadership, Charter/Bylaws
- **Membership** — Membership types (with pricing), searchable member directory, online
  application flow
- **Professional Development** — Courses, Workshops & Seminars (certifications, exams, and a full
  event calendar are planned later — the concept should show how the page grows into those
  without a redesign)
- **Technical Committee** — currently undefined/reserved on both the old site and our sitemap;
  design a credible "placeholder" state (what this section becomes is still open) rather than
  fabricating content for it
- **Publications & Resources** — Cookbook, Legislative & Regulatory Acts, International
  Literature; needs to read well as a *searchable library*, not a flat list — this is one of the
  most-used sections
- **Equipment** — Equipment catalogue, technical specifications (an RFP module and technical
  guidelines are future additions)
- **Career** — two distinct tracks: job seekers browsing openings, and employers posting
  vacancies/reviewing applications
- **News** — article list + detail
- **Contact & Feedback** — contact form, feedback form, map/location
- **Global Search** — cross-cutting, not a page of its own: needs a strong visual identity since
  it's the primary way many visitors (especially returning ones looking up a specific standard)
  will actually use the site

---

## 5. UX principles this concept must express

- **Every nav item works.** State this as a hard constraint, not a suggestion — it's the single
  biggest gap versus the current site.
- **Search is a first-class feature, not an afterthought.** It should feel prominent and a little
  distinctive — worth a real design idea, not just a text input in a corner. (For context: our
  current build has a hero search bar plus a ⌘K command-palette-style overlay reachable from
  anywhere; feel free to keep, refine, or replace that idea, but search deserves genuine design
  attention.)
- **Give people a reason to come back.** Fresh signals on the homepage (news, events), member
  self-service (directory, course sign-ups, application status), not a static brochure.
- **Serve distinct intents clearly.** A prospective member, a job seeker, and someone looking up a
  legislative act are doing three different things — the IA and homepage should route each of
  them quickly, not force everyone through the same generic path.
- **Credible but approachable.** This is a technical/scientific professional body — the design
  should read as competent and trustworthy without becoming sterile, bureaucratic, or
  clip-art-corporate.
- **Multilingual by construction.** Design with Cyrillic text and a visible language switcher in
  mind from the start, not as a localization afterthought.
- **Mobile-first.** Assume a meaningful share of traffic is mobile; don't design a desktop
  experience and hope it degrades gracefully.

---

## 6. Visual direction

- **Palette**: anchored on the logo — dark navy + a confident blue accent, light/white base.
  Open to a secondary/supporting color if it earns its place (e.g. a warm accent for
  urgency/CTAs), but the navy+blue-on-white identity should stay dominant and recognizable.
- **Typography**: clean, modern sans-serif with strong Cyrillic support and good legibility at
  small sizes (dense content like legislative-act titles and course listings needs to stay
  readable).
- **Imagery**: the current site leans on generic blurred stock lab photography. We'd like this
  concept to propose something more distinctive and ownable — whether that's more authentic
  photography direction, a lightweight illustration/iconography system, or a different approach
  entirely. Flag this as an open design opportunity, not a solved problem.
- **Iconography**: technical/scientific in spirit but approachable — avoid generic corporate
  clip-art icon packs.
- **Systemic, not one-off**: this will be built by a small team on a real timeline. Favor a strong,
  reusable component system (cards, list rows, filter panels, empty states) over elaborate
  bespoke treatments that only work on one page.

---

## 7. Constraints

- Must support Russian, Uzbek, and English content and UI throughout.
- Must be realistically buildable on a standard modern web stack (React/Next.js + Tailwind-style
  CSS) — ground the concept in real, implementable web patterns rather than effects that only
  exist in a static mockup (parallax/WebGL-heavy treatments, etc. are not a good fit here).
  Reasonable, tasteful motion/interaction is welcome.
- Accessibility matters: real contrast ratios, keyboard-navigable interactive elements, readable
  type scale.

## 8. What we're looking for back

A full-site concept covering the sitemap in §4 — enough of a system (palette, type scale,
component patterns: nav, hero, cards, search, filters, forms, empty states) that every page above
can be designed consistently from it, plus concept treatments for: the Home page, the Publications
& Resources listing (as the representative "searchable library" page), and the global Search
experience specifically. Show at least one mobile view. Call out anywhere you deviated from or
extended this brief, and why.
