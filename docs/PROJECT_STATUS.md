# Project status: The Cut Barbershop

Written 2026-10-31 from the project docs, git history and the route list. No source file was opened for this document, so anything the docs do not say is marked "unknown". "Done" means code exists. "Verified" says how far it was tried.

## 1. Snapshot

| Item | Value |
|---|---|
| Date | 2026-10-31 |
| Branch | `feature/d2-archive-restore` (tracks `origin/feature/d2-archive-restore`) |
| Last 5 commits | `7274500` docs: archive and restore; `1d16e36` feat: archive and restore for services, packages and barbers; `a70a4b2` docs: default-deny, site images switch and real 404; `a54d697` feat: default-deny Admin switches, site images switch fix and real 404; `e8a4297` fix: barber status badge shows No hours |
| Uncommitted files | None before this file; `docs/PROJECT_STATUS.md` is new |
| Pushed | Yes, 0 ahead and 0 behind its remote branch. The remote has only `fix/claude-cleanup` (GitHub default) and `feature/d2-archive-restore`; there is no `main` on GitHub. A local `master` (7 old commits, never pushed) is an ancestor of both (checked 2026-10-31) |
| Tests | 747 passed in 89 files (Vitest, mocked databases and auth; no browser end-to-end suite) |
| Lint / build | Lint clean; `next build` compiled, both last run when D2a was finished |
| Stack | Next.js 16.4.3 App Router, React 19.3.0, JavaScript and JSX only, Tailwind 4 |
| Data and auth | MongoDB driver 7.7 on Atlas (dev database `the_cut`), Better Auth 1.7 with database sessions and TOTP |
| Other | Zod 4, Nodemailer 10 (SMTP), Cloudinary through a server-signed REST adapter (no SDK), Vitest 5, ESLint |

## 2. Progress by area

Method for the percentages: units or features built divided by units or features planned for that area, then lowered when nothing was tried live. They are rough.

| Area | Status | % | What is left |
|---|---|---|---|
| Public website | Done-not-live-tested | 80 | Real photos, real reviews (sample copy now), contact details, legal text, newsletter and shop links hidden |
| Design match with mockups | In progress | 60 | Public pages follow the reference; dashboards are plain compared with `docs/design/deshboard.png`; desktop visual check not recorded |
| Auth and sessions | Done-not-live-tested | 80 | Owner confirms Admin and Super Admin sign-in work; email verification is off; production cookie, origin and proxy checks open |
| TOTP and role security | Done-not-live-tested | 75 | TOTP and permission switches live-tested; step-up for sensitive actions not wired everywhere; no QR code; Atlas session-invalidation tests open |
| Booking engine and booking pages | Done-not-live-tested | 80 | Only 2 barbers have working hours; Atlas race tests not run; no live booking-to-email run |
| User dashboard | Done-not-live-tested | 85 | Overview, appointments, profile checked live with dummy accounts earlier; avatar upload not live; `/user/security` missing |
| Admin dashboard | In progress | 70 | Page loads and permissions tried live; most actions not tried; overview is an empty placeholder; delete and archive for gallery and messages (D2b) |
| Super Admin dashboard | In progress | 25 | Only `/super-admin/permissions` works; overview is a placeholder; I-23 to I-27 not started |
| Media (Cloudinary) | Done-not-live-tested | 80 | 3 real uploads exist and the barber picture shows; owner must set the correct cloud name in `.env` and run the check; the home hero image fails on the live site (undiagnosed) |
| Email (Nodemailer) | Done-not-live-tested | 65 | One test message accepted by the provider, inbox receipt unconfirmed; no live run of verification, reset or booking mail; SPF, DKIM, DMARC not done |
| SEO | In progress | 55 | `robots` and `sitemap` exist; sitemap is empty until `SITE_URL` is the live domain; no per-page SEO fields; structured data unknown |
| Performance | In progress | 50 | Fixed image sizes, caching, lazy images in place; no Lighthouse or load measurement recorded |
| Accessibility | In progress | 40 | Focus trap, 44 px targets, alt text rules done; no audit or screen-reader pass recorded |
| Tests | Done | 80 | 747 unit tests; no end-to-end browser tests; live checks are manual |
| Docs | Done, with drift | 85 | Several docs hold older statements (see section 8) |
| Deployment readiness | Not started | 15 | Host, domain, production Atlas, email DNS, Turnstile keys, monitoring, backups |

Rough overall: about 60 percent of the planned product exists in code; about 40 percent has been tried live.

## 3. Routes

| Role | Exists | Planned or missing |
|---|---|---|
| Public | `/`, `/about`, `/services`, `/gallery`, `/pricing`, `/contact`, `/booking`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/robots.txt`, `/sitemap.xml`, `/design-system` (development only) | Shop (Phase H), legal pages, offers page or section routes, newsletter |
| Any signed-in admin | `/two-factor` (authenticator setup) | QR code for setup |
| USER | `/user`, `/user/appointments`, `/user/profile` | `/user/security` (menu entry off) |
| ADMIN | `/admin` (empty overview), `/admin/bookings`, `/admin/bookings/all`, `/admin/bookings/walk-in`, `/admin/customers`, `/admin/services` (+`/new`, `/[slug]`), `/admin/packages` (+`/new`, `/[slug]`), `/admin/barbers` (+`/new`, `/[slug]`), `/admin/gallery`, `/admin/messages` (+`/[id]`), `/admin/reports`, `/admin/settings` | Offers, content manager, reviews, products |
| SUPER_ADMIN | Everything above, plus `/super-admin` (placeholder), `/super-admin/permissions` | `/super-admin/admins`, `/audit`, `/revenue`, `/security`, `/images` (menu entries off) |
| API | `/api/auth/[...all]`, `/api/bookings` (+`availability`, `/[id]/cancel`, `/reschedule`, `/no-show`), `/api/media`, `/api/account/avatar`, `/api/admin/catalog-image`, `/api/admin/gallery` | Offers, content, export routes |

## 4. Feature inventory

Verification: U = unit tests only; L = live-tested by the owner or me; N = not verified; "L (page)" means the page opened live but its actions were not tried.

| Feature | Status | Verification | Notes and folder |
|---|---|---|---|
| Public pages (home, services, gallery, pricing, about, contact) | Done | L (browser) | `src/app`, `src/features/landing`; sample reviews, concept imagery |
| Stage 3 pages (about, gallery, pricing, contact, forgot and reset password) | Done | U + browser | Contact form sends mail; not run live |
| U1 fixes (preselect, contact config, mobile menu) | Done | U + browser | `lib/booking/preselect.js`, `components/contact` |
| Booking engine and API | Done | U | `lib/booking`; seed done on `the_cut`; race tests not run |
| I-1 routes and guards | Done | L | `lib/auth/dashboard-guard.js` |
| I-2 dashboard shell | Done | L (page) | `features/dashboard/components` |
| I-3 TOTP pages | Done | L | `/two-factor`, owner confirmed |
| I-4 admin seed | Done | L | `scripts/seed-admins.js` |
| I-5 to I-7 data layer, barbers public, settings | Done | U + L (page) | `lib/catalog` |
| I-8 user overview and reschedule or cancel | Done | L (dummy accounts) | `/user` |
| I-9 profile, password, sessions | Done | L (dummy accounts) | `/user/profile` |
| I-10 avatar and deletion request | Done | U | upload not live |
| I-11 today's bookings with status changes | Done | U, L (page) | `/admin/bookings` |
| I-12 all bookings search | Done | U, L (page) | `/admin/bookings/all` |
| I-13 walk-in booking | Done | U, L (page) | `/admin/bookings/walk-in` |
| I-14 customers list | Done | U, L (page) | read-only |
| I-15 services CRUD | Done | U, L (page, archive) | `/admin/services` |
| I-16 packages CRUD | Done | U, L (page, archive) | `/admin/packages` |
| I-17 barbers CRUD and schedule | Done | U, L (page, edit page, archive) | `/admin/barbers` |
| I-18 closed dates and settings | Done (built inside I-7) | U, L (page) | `/admin/settings` |
| I-19 gallery manager | Done | U; 2 real uploads exist | `/admin/gallery` |
| I-20 contact messages | Done | U, L (page) | `/admin/messages` |
| I-21 review moderation | Not started | none | skipped: no real reviews exist |
| I-22 operational reports | Done | U, L (page) | no money figures |
| I-23 admin accounts | Not started | none | Super Admin; account creation or role changes |
| I-24 audit log viewer | Not started | none | audit events are written already |
| I-25 security settings view | Not started | none | |
| I-26 revenue and CSV export | Not started | none | |
| I-27 image slot screen | Not started | none | engine exists (`lib/images/admin-slots.js`) |
| I-28 role-specific data, IDOR tests | Not started | none | partly covered by the capability tests |
| I-29 live media tests with real roles | Not started | none | |
| I-30 barber schedules and Atlas race tests | Not started | none | needs owner data |
| C1, C2 Cloudinary | Done | U + owner uploads | `lib/storage`, `scripts/check-cloudinary.js` |
| D1 pictures for services, barbers, packages | Done | U; barber picture shown live | `lib/catalog/catalog-images.js` |
| P1 capability engine | Done | U, L | `config/admin-capabilities.js`, `lib/auth/capabilities.js` |
| P2 permission screen | Done | L | `/super-admin/permissions` |
| Default deny and real 404 for revoked pages | Done | L | live test 2026-10-30 |
| D2a archive and restore (services, packages, barbers) | Done | U, L | `lib/catalog/archive.js`, 32 switches |
| D2b gallery and messages archive, permanent delete | Not started | none | needs owner ok |
| Barber picture fix and list badge | Done | L | |

## 5. Not started or only requested

| Item | Status | What already exists to build on |
|---|---|---|
| (a) Super Admin controls everything: per-Admin grants, presets, non-delegable actions, audit and step-up | Partly | One shared switch set for the one Admin (32 switches, default deny, live-tested); step-up with authenticator code on save; audit on save. Owner decided no per-Admin grants. Not started: presets, export switches, a non-delegable action list, audit viewer (I-24), admin account screen (I-23) |
| (b) Content manager (logo, favicon, site name, tagline, hero, section show/hide and order, navigation, footer, about text, SEO fields, policy pages, draft and publish) | Not started | Business settings editor (hours, contact, social), image slot overrides (no screen), catalog cache tags, nav in `config/navigation.js`, hero text in code |
| (c) Offers system (discount types, code, dates in New York time, limits, services, image, terms, many placements, applied server-side with redemption tracking) | Not started | `CtaBanner` (offer-free), pictures pipeline (D1), cache tags, booking price snapshots, `offersManageAll` and `offersRedeemOwn` permission names (unused) |
| (d) Premium dashboard redesign in the mockup style (glass and gold cards, KPI cards, charts, chips, skeletons) | Not started | Dashboard shell, primitives, tokens, loading and error components, `docs/design/deshboard.png` |
| (e) Shop (Phase H) | Not started | Product permission names only; no model or screen |
| (e) Real reviews | Not started | Sample carousel, `reviewCreateOwn` and `reviewsModerateAll` permission names (unused) |
| (e) Newsletter | Not started | Hidden footer slot |
| (e) My appointments screens | Done | `/user/appointments` |
| (e) Booking stepper | Skipped by decision | Single form with progress indicator |
| (e) Legal pages | Not started | Footer link hidden |
| (e) TOTP QR code, hero image fix, products admin | Not started | Key shown as text |

## 6. Decisions already made

| Decision |
|---|
| Next.js Route Handlers and Server Actions only; no Express and no JWT; Better Auth with database sessions |
| Exactly three roles (Super Admin, Admin, User) plus guests; one Super Admin and one Admin, many Users; not multi-tenant |
| Booking: America/New_York, USD, 15-minute grid, 5-minute buffer, 60-minute lead, 30-day window, max 3 services, max 2 active bookings, 24-hour cancel cutoff, pay at the shop |
| Prices come from the database, never from the browser; bookings keep their own price snapshot |
| Pricing packages are separate from catalog prices |
| Email verification is off behind a flag (`AUTH_REQUIRE_EMAIL_VERIFICATION`, default false) |
| TOTP is required for Admin and Super Admin |
| Cloudinary replaces ImgBB (ImgBB blocked for the owner); ImgBB kept only for old images |
| Images: fixed folders, 4 MB cap, server re-encode to WebP, fixed delivery sizes, alt text required |
| Hide, archive and restore instead of hard delete for services, packages and barbers; only the Super Admin may delete permanently (D2b) |
| Contact messages: Admins may delete (2026-10-30), now behind the switch `messages.delete` |
| Admin switches are one shared set, default deny; the overview is always open; Super Admin never limited |
| Barber with upcoming pending or confirmed bookings cannot be archived; restored records return hidden; archived slugs stay reserved; no automatic purge |
| Newsletter, policies link and booking stepper hidden or skipped for now |
| Seeds run only against the dev database with an explicit opt-in |
| The owner commits; blocks with explicit `git add <paths>` are given; documentation is updated with every task |

## 7. Open questions and things only the owner can do

| Item | Notes |
|---|---|
| Prices and package contents | Catalog prices approved; package contents and prices need confirming |
| Contact details and social links | Phone, email, street address, social URLs are empty in `config/site.js` or settings |
| Photos and logo | Real photos for services, barbers (4 of 5 have none), gallery; logo and favicon |
| Real reviews | Carousel is sample copy |
| Barber schedules | Only 2 barbers have working hours; others show "No hours" |
| Correct cloud name | Set the right `CLOUDINARY_CLOUD_NAME` in `.env`, restart, rebuild, run the check |
| Production database and Atlas network access | Production cluster, IP allow-list, backups: unknown |
| Domain and hosting choice | Not decided in the docs |
| Email domain (SPF, DKIM, DMARC) and sender verification | Not done; the owner mentioned Resend, the code uses generic SMTP |
| Turnstile keys | Not set in a deployed site |
| Legal text | Privacy, terms, cancellation policy |
| Decide D2b, offers rules, content manager scope | Waiting for the owner's "ok" and answers |
| Home hero image problem on the live site | Needs the live address and the failing request |
| Test records to remove or keep | Barber `kjwfwoifwl` ("wfoijwfnwfe"), package `jjjjj` ("cut"), gallery items "Best Haircut" and "Smart haircut", 2 test bookings; no customer accounts remain (the 2 accounts are the owner's) |

## 8. Known issues and risks

| Issue | Rating |
|---|---|
| Admin actions mostly untried live (status changes, walk-in, messages, gallery, settings, reports) | High |
| Security checklist still PARTIAL: Atlas session invalidation tests, production cookie and origin checks, step-up on sensitive actions, attack suite not run | High |
| No deployment, production database or email DNS | High |
| Booking race tests on Atlas not run; barber schedules missing | Medium |
| Home hero image missing on the live site; not reproducible locally (file tracked since 2026-10-29, no slot override, 200 at all widths, CSP allows it); needs the live address and the failing request | Medium |
| Super Admin overview and Admin overview are placeholders | Medium |
| Email delivery never confirmed in an inbox; verification, reset and booking mail not run live | Medium |
| Denied admin pages send a real 404 only on full loads; after in-app navigation the page check applies (user still sees 404) | Low |
| Archived packages: a catalog with only archived packages shows an empty list | Low |
| Archiving a package clears its Popular badge; restore does not bring it back | Low |
| Docs drift (NEXT_TASK test count, PROGRESS and CLAUDE.md uncommitted lines, PERMISSIONS naming): fixed 2026-10-31; older history entries in PROGRESS.md and AI_HANDOFF.md still describe past states | Low |
| `tests` are mocked; no end-to-end browser suite | Medium |
| Console shows CSP inline-style blocks on the home page (cause not traced) | Low |
| No QR code for authenticator setup (key shown as text) | Low |
| Unused permission names (offers, reviews, loyalty, orders) with no code behind them | Low |
| Node warns about the module type of `.js` files (known, harmless) | Low |

## 9. Remaining work estimate (an estimate, not a promise)

S = small, M = medium, L = large. Counts come from the plan, not from reading code.

| Area | Units | Sizes |
|---|---|---|
| Super Admin screens I-23 to I-27 | 5 | 1 L, 3 M, 1 S |
| Hardening I-28 to I-30 | 3 | 3 M |
| D2b (gallery, messages, permanent delete) | 1 | 1 L |
| Permission extras (presets, non-delegable list) | 2 | 1 M, 1 S |
| Content manager (branding, sections, navigation and footer, SEO fields, policy pages, draft and publish) | 6 | 1 L, 4 M, 1 S |
| Offers (data and admin, placements, server-side use with redemption, popup) | 4 | 2 L, 1 M, 1 S |
| Dashboard redesign (shell, widgets and charts, user dashboard, real overviews) | 4 | 1 L, 3 M |
| Shop (Phase H) | 3 | 2 L, 1 M |
| Reviews (real reviews, moderation) | 2 | 1 M, 1 S |
| Newsletter, booking stepper, TOTP QR | 3 | 2 M, 1 S |
| SEO, performance, accessibility passes | 3 | 3 M |
| Launch (hosting and domain, production Atlas, email DNS, monitoring, production security checks) | 5 | 1 L, 3 M, 1 S |
| **Total** | **41** | **9 L, 25 M, 7 S** |

Recommended order and why:
1. Owner tasks and live tests (cloud name, photos, barber hours, contact details): cheap and they unblock real data.
2. D2b, then I-23, I-24, I-28: finish the archive and delete rules and the Super Admin controls while the permission design is fresh; security first.
3. Offers, then the content manager: the highest business value, both build on the same pictures and cache tags.
4. Dashboard redesign: after the screens it styles are stable, so it is done once.
5. Reviews, newsletter, legal pages, SEO, performance and accessibility passes.
6. Shop (Phase H) only if wanted for launch.
7. Launch work last, but start domain, email DNS and Atlas questions early because they depend on others.

## 10. Environment variable names and commands

Names only, from `.env.example`; values are never recorded.

| Group | Names |
|---|---|
| Site and database | `SITE_URL`, `MONGODB_URI`, `MONGODB_DB_NAME` |
| Auth | `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `AUTH_REQUIRE_EMAIL_VERIFICATION` |
| Seed accounts | `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`, `SEED_SUPER_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO` |
| Media | `STORAGE_PROVIDER`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `IMGBB_API_KEY` (legacy) |
| Bot check | `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |

| Command | Use |
|---|---|
| `npm run dev` | Development server on port 3000 (sign-in works on this origin) |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` then `npm run start -- -p 3002` | Production build and a test server (override `SITE_URL` and `BETTER_AUTH_URL` for the port) |
| `NODE_ENV=development npm run seed:booking:dev [-- --apply]` | Booking seed; read-only without `--apply`; do not apply over edited prices |
| `npm run seed:admins:dev` | First Super Admin and a test Admin, dev database only |
| `npm run check:cloudinary` | Credential check for Cloudinary, development only |
