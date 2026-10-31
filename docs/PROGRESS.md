# Progress

**Current state (2026-10-31): see `docs/PROJECT_STATUS.md` for the full picture.** This file is a dated log. Entries before the Phase I section are historical (for example, the `the_cut` database has since been seeded and the dashboards and booking APIs now exist).

## Completed

- **Seed connection diagnosis (2026-10-29):** Verified env-variable presence only and resolved effective DB `the_cut`; no values/URI were printed. MongoDB driver 7.7.0 performs `mongodb+srv` SRV/TXT DNS before its server-selection timeout. Configured and public DNS control requests timed out, so the runtime's external DNS path is the evidenced blocker; Atlas allow-list/authentication status remains unknown. Added seed-only connect/selection/socket/operation limits and a 15-second connect watchdog with sanitized errors; app Mongo defaults are unchanged. The read-only preflight exited at the watchdog and did not finish collection reads. No seed/write occurred. Focused tests 7/7, full tests 228/17, lint 0 errors/one pre-existing warning, and build passed.

- **Seed initialization follow-up (2026-10-29):** Fixed the `@next/env` CommonJS interop by consuming its default export and passing an explicit development flag. Added focused tests for loader mode; `npm.cmd test` passed (227 tests/16 files), lint exited 0 with one existing HeroSection warning, and `node --check` passed for the seed files. The default preflight resolved `the_cut` and confirmed read-only mode, but its Mongo connection did not return; it was interrupted before any collection result. No writes or database modifications occurred. Node's separate `MODULE_TYPELESS_PACKAGE_JSON` warning remains because root `.js` ESM modules are auto-detected; root module type was not changed due project-wide tooling impact.

- Initial planning and reference audit are documented in requirements, architecture, permissions, security, data, design, and implementation-roadmap docs.
- Home (`/`) is implemented as modular sections with shared transparent responsive navigation, hero, service/barber previews, sample review carousel, and footer.
- Services (`/services`) is implemented as a Server Component route using its own photo-led hero, functional client-side service-category filters, shared cards/reviews/footer, and an honest illustrative-menu disclosure.
- Shared navigation/footer destinations are root-qualified so they work from both routes; active route state is passed into the header.
- Homepage service-card actions now lead to the implemented `/services` route instead of the pending booking route.
- The final homepage design is documented in `docs/DESIGN_SYSTEM.md`; reusable component usage and boundaries are described in the new `docs/COMPONENT_GUIDE.md`.
- Approved booking prices and durations are now in the shared public service catalog; database service rows remain pending the guarded user-run seed. Staff schedules and reviews remain unverified.
- Better Auth is installed as the Phase D authentication foundation; the local Mongo-backed handler returned HTTP 200, while email-backed lifecycle and production database verification remain pending.
- Booking (`/booking`) follows the reference hierarchy and connects to the Phase G availability/booking API. Availability and confirmation require the approved server-side service records in MongoDB and verified barber schedules. See `docs/BOOKING_PAGE_AUDIT.md`.
- Historical Phase G preview inventory superseded by the 2026-10-28 booking implementation recorded under Current checks.
- Historical Phase G blocker note superseded: rules and approved service prices are supplied; database service rows and real staff schedules remain unverified.
- Hydration warning finding: Temp Mail Org injects `data-temp-mail-org` and styles into the contact email input. Clean Playwright showed no injected attribute/style and no hydration warning; do not suppress or change app markup for this environment-specific extension behavior.
- HMR finding: previous `/_next/hmr` WebSocket refusals coincided with a period when no responding server was observed. Follow-up found the Next dev server on port 3000 (PID 10204); first `/contact` compile took ~16 seconds after a slow-filesystem warning, then returned HTTP 200. Clean Playwright reported no fresh console issues, and a WebSocket probe opened. No wrong-port or proxy fault was found; no Next config change was warranted. Because the original dev terminal was unavailable, it is not possible to distinguish whether that server had stopped, restarted, or was still starting.
- Phase A static audit is complete in `docs/AUDIT.md`.
- Phase B added `src/config/` site/routes/navigation/permissions/env modules, the Tailwind-mapped token sheet, Cormorant Garamond and Manrope via `next/font`, baseline security headers, and updated project docs. Future backend operations are planned inside Next.js Server Actions and Route Handlers; no separate Express app.
- Booking visual defects were corrected: its header now flows before the intro, booking labels/helper/calendar text were increased, and details/summary stack at tablet widths.
- Phase C added `SiteFrame`, `PageContainer`, and `PageSection`; `cva`/`clsx`/`tailwind-merge` composition; `Surface` and `TiltSurface`; glass/depth/motion tokens and CSS recipes; `MotionReveal`; root Lenis + GSAP ScrollTrigger synchronization; and the deferred, reduced-motion/low-power-aware R3F gold-dust accent in the homepage hero.
- Added `/design-system`, registered as development-only, omitted from navigation, and gated with `notFound()` outside development. It previews buttons, glass/depth surfaces, tilt, and reveal motion.
- Phase D added the Better Auth Next.js Route Handler/MongoDB adapter, server-only pooled Mongo client and auth/security indexes, validated server env names, protected role/status/sessionVersion fields, uncached DB-session authorization with session-version comparison, TOTP enrollment requirement, shared MongoDB-backed auth rate limits, trusted-origin checks, append-only audit events, nonce CSP, and policy/session-version tests. This task added pseudonymized failed-auth audit events and burst markers, explicit TOTP account lockout, session-bound ten-minute TOTP step-up proofs, a step-up authorization helper, and session-version bump unit tests. The same-origin app uses Better Auth DB sessions instead of a parallel JWT/refresh system.
- Phase E added public `/about`, `/gallery`, `/pricing`, and `/contact` preview routes, registered them centrally, updated desktop/mobile navigation and footer links, and added page metadata, `robots.txt`, and `sitemap.xml`. Gallery filtering/lightbox are client-side only. Concept imagery and unknown copy/pricing/contact information are disclosed; no form submission or business operation was added.
- Phase D local hardening added strict sign-in payload checks, failed-sign-in response normalization with a minimum response timing floor, an allow-listed primitive-filter guard, shared rate-limit policy configuration, and matrix-driven role tests generated from `src/config/permissions.js`. No server-side business query-filter endpoints exist yet.
- Added `/sign-in` and `/sign-up` guest-only routes and a shared accessible client form that uses Better Auth's same-origin API. Opaque token fields are removed from auth JSON responses while session cookies are preserved.
- Phase F auth email work: added a server-only Nodemailer transport using SMTP env values; Better Auth sends one-hour verification links after sign-up and unverified sign-in. Verification token hashes are stored with a TTL and atomically consumed once by the auth Route Handler. Failed-auth audit bursts at five attempts per source IP in ten minutes queue a security email to `MAIL_TO`. Background delivery failures use `auth.email_verification.delivery_failed` and omit SMTP details. Follow-up fixed safe display-name sender validation and made development auth/mail origins prefer server `SITE_URL`.
- Phase F media/contact work: added the server-only ImgBB storage adapter and `/api/media` upload/delete route, Mongo media model, role enforcement, five-MiB byte/MIME inspection, Sharp resize/WebP conversion, and Next image remote pattern. `/contact` now has a signed-timing-token form, honeypot, optional Turnstile hook, public IP rate limit, persisted `ContactMessage` records, and background notification/auto-reply through shared SMTP. Provider and browser flows were not exercised.
- Development auth-rate-limit recovery: confirmed signup counters are stored in MongoDB `rateLimit` with a 5-per-IP, 3,600-second rolling window. Added an explicitly confirmed reset script guarded by development mode and loopback-only Mongo host checks. It has not been run; see `docs/AUTHENTICATION.md`.

## Current checks

- **Phase G follow-up (2026-10-29):** Added approved six-service catalog and prices/durations shared by site UI and seed plan; backend accepts only positive safe integer server-side prices and snapshots current prices at booking creation. Added a safe `the_cut` seed preflight: default is read-only; write requires development mode, exact effective database match, `--apply`, and explicit environment opt-in. It plans only targeted service/barber upserts and stops on legacy/identity ambiguity. Existing barber schedules are preserved; new barbers have empty schedules. The database collections and seed writes were not performed in that implementation task; a later read-only preflight attempt is recorded above. `npm.cmd test` passed 225 tests across 15 files; `npm.cmd run lint` exited 0 with one existing HeroSection warning; `npm.cmd run build` passed and compiled all booking routes (3.3 minutes for compilation).
- The database name `the_cut` is user-provided, not independently inspected. The app's existing configuration resolves `MONGODB_DB_NAME` over the URI path. No `.env` value was read or printed. Existing authentication, email, and historical booking data are outside the seed's read/write scope.

- **Phase G update (2026-10-28):** Booking now uses timezone-aware New York availability, transactional Mongo create/cancel/reschedule/no-show operations, unique quarter-hour occupancy rows including cleanup buffers, Better Auth verified-user/ownership authorization, public rate limits, audit events, after-response mail, and a callable reminder worker. Development seed script was added but not run. The approved source catalog is now configured; the API/UI block confirmation until database service rows are reconciled and seeded. Seed roster/schedules remain assumptions requiring verification. `npm.cmd test`: 215 passed across 14 files; `npm.cmd run lint`: 0 errors with one existing HeroSection warning. `npm.cmd run build` passed; the new booking API routes and `/booking` compiled successfully. No live booking, email, seed, or browser booking run.
- **Current Phase G status:** DONE-LOCAL, not live-ready until `the_cut` service records are safely seeded and barber schedules are verified. Phase H has not started. Phase I real role sessions and ImgBB test, Phase K configured Turnstile and production email DNS/domain checks remain carryovers.

- Phase F media/contact: `npm.cmd test` — 201 tests across 11 files passed; `npm.cmd run lint` — 0 errors, one existing `HeroSection.jsx` warning; `npm.cmd run build` passed after network approval to fetch configured Google Fonts. No live browser, ImgBB, or contact email test was run.
- `npm.cmd run lint` — passed after Phase D changes with one existing `aria-hidden` type warning in `HeroSection.jsx`.
- `npm.cmd test` — 10 tests passed across 3 files after the Phase D hardening changes.
- `npm.cmd run lint` — passed with one existing `aria-hidden` type warning in `HeroSection.jsx`.
- `npm.cmd run build` — passed; `/api/auth/[...all]` compiled with the updated hooks and the full app generated.
- `npm.cmd run build` — passed after Phase D changes; `/api/auth/[...all]` compiled and all pages render dynamically for per-request nonce CSP.
- Phase F `npm.cmd install nodemailer` — completed; npm added the dependency and reported 0 vulnerabilities. Install script `unrs-resolver` remained blocked by the package manager's allow-scripts policy.
- Phase F `npm.cmd run lint` — passed with the existing `HeroSection.jsx` `aria-hidden` warning. `git diff --check` reported no whitespace errors (only Git line-ending notices).
- Phase F `npm.cmd test` — passed: 168 tests across 8 files, including mock SMTP transport, verification expiry/single-use, escaping, burst threshold, and redacted delivery-failure audit coverage.
- Phase F `npm.cmd run lint` — passed with the existing `HeroSection.jsx` `aria-hidden` warning; `npm.cmd run build` — passed and compiled `/api/auth/[...all]`.
- Earlier presence-only check found the documented SMTP names. A later live transport check authenticated and the provider accepted one test message. No values were inspected. Client bundle scan found no SMTP variable names or Nodemailer code in `.next/static/chunks`.
- Phase E `npm.cmd run lint` — passed with one existing `aria-hidden` warning in `HeroSection.jsx`.
- Phase E `npm.cmd run build` — passed; About, Gallery, Pricing, Contact, robots, and sitemap routes compiled. The local `SITE_URL` is localhost, so the sitemap intentionally returned no URLs and robots omitted the sitemap declaration.
- Auth UI continuation `npm.cmd test` — 162 tests passed across 5 files; lint passed with the existing `HeroSection.jsx` warning; build passed with `/sign-in` and `/sign-up` included. Logout lifecycle test uses Better Auth's in-memory adapter.
- Playwright checked `/sign-up` and `/sign-in` at `localhost:3000`; both rendered without console errors. No form was submitted to the app database. The isolated test server could render `/` but its session/auth routes did not respond, so no dummy account or Atlas test data was created.
- Edge/Playwright at localhost:3000 and the production build at 3001 — `/about`, `/gallery`, `/pricing`, `/contact` returned 200 at 1440, 768, and 375px with no horizontal overflow or page errors. Gallery filter and Escape-to-close dialog interaction worked.
- Production HTTP smoke check with `npm.cmd run start -- --port 3011`: `/`, `/services`, and `/booking` returned 200; `/design-system` returned 404. The development server remains the user's port 3000 instance.
- Development HTTP check at `http://localhost:3000/design-system` returned 200.
- `npm.cmd install class-variance-authority clsx tailwind-merge motion gsap lenis three @react-three/fiber` — completed; npm reported 0 vulnerabilities.
- Playwright/Chrome review at 1440px, 768px, and 375px: the intro begins at the header bottom; details/summary show two columns at 1440 and stack at 768/375; no horizontal overflow or console errors. Smallest measured booking text is 11px desktop/tablet and 9px for mobile progress labels. Captures are in ignored `.next/phase-b-booking-{1440,768,375}.png`.
- Edge/Playwright against the development server at `http://localhost:3000` and production build at port 3001 verified nonce CSP, nonce-bearing inline scripts, no console errors, and no horizontal overflow on `/booking` at 1440, 768 and 375px. A local no-cookie session lookup passed; signup/sign-in and email lifecycle remain unverified.
- Booking submission is not connected to a backend; no customer details are transmitted or persisted.
## Remaining limits (historical, written 2026-10-29; see docs/PROJECT_STATUS.md for today's list)

- The user-requested card image is one visibly watermarked scissors image reused across service, barber, and review cards; replace it with approved appropriate photos before representing the cards as real content.
- Approved service list/prices are supplied and implemented. The existing DB is not seeded; production barber names/schedules/hours/holidays still require confirmation.
- Shop, customer/admin dashboards, and booking APIs remain unimplemented. Contact message submission is implemented in Phase F; About, Gallery, Pricing, and other content remain presentation pages using disclosed concept content. Booking is only a disclosed interface preview.
- Before enabling real booking, settle the business rules and implement the authoritative Next.js server operation with MongoDB, availability/concurrency validation, and required Better Auth/authorization integration.
- No verified staff identities, authentic reviews, business hours, or contact channels are available.

## Phase D open security work

- Local database/auth settings were exercised through `GET /api/auth/get-session` (HTTP 200), which initializes the database and security indexes. Signup and production lifecycle checks remain pending. SMTP transport submission passed; inbox receipt and auth mail flow checks remain pending.
- Failed-auth attempts and burst markers are recorded in the audit log; threshold email notification is implemented but delivery remains unverified. Session-bound TOTP step-up support is implemented. `GET /api/auth/get-session` returned HTTP 200 with no session payload. Remaining: privilege-change audit producers, integration of step-up checks into sensitive operations (none exist yet), Atlas-backed session invalidation tests, production cookie/origin/trusted-proxy checks, and the Section 11.1 attack suite. Phase D is **not DONE** under the master prompt's security gate.

## Phase F status

- **DONE-LOCAL.** Auth verification mail and thresholded failed-auth email alerts use the shared server-only Nodemailer transport. Links expire after one hour and are single-use. Contact messages are persisted before `after()` mail delivery. Mock coverage includes sign-up queue, unverified sign-in resend, expiry/replay, escaping, redacted provider failure, both contact messages and persistence-before-failure.
- Root cause fixed: safe display-name `MAIL_FROM` syntax was rejected by the shared mailer before SMTP send; the background handler swallowed the exception and logged `auth.email_verification.delivery_failed`. Development auth and mail origins now prefer server-side `SITE_URL`.
- Exactly one test-labeled delivery attempt was made to `MAIL_TO`; the command timed out without provider acceptance confirmation. It was not retried; inbox receipt is unconfirmed. No account, live sign-up, or rate-limit collection was touched. No env values were printed.
- Explicit carryovers: **Phase I** real role sessions for media upload and live ImgBB upload test; **Phase K** Turnstile in a configured deployment and production SPF/DKIM/DMARC plus domain verification. Phase D production/Atlas checks remain open.
- Verification: `npm.cmd test` — 207 passed across 12 files; `npm.cmd run lint` — 0 errors, one existing HeroSection warning; `npm.cmd run build` — passed. Client chunk scan found no SMTP/ImgBB secret names, Nodemailer, or `deleteUrl`.

## Exact next task (historical, 2026-10-29; superseded by NEXT_TASK.md)

Phase G is implemented locally. Next: review the read-only seed plan for `the_cut`, resolve any ambiguity, then user-authorize a seed only after review and confirm barber schedules. Run controlled Atlas transaction/session checks before enabling live bookings. Keep Phase H unstarted until those launch prerequisites are satisfied; Phase I/K carryovers remain separately documented.

## Navbar session, design audit and preflight (2026-10-29)

- Navbar sign-in/out is now driven by the real Better Auth session. `src/features/auth/session-store.js` mirrors `GET /api/auth/get-session` and `POST /api/auth/sign-out`. The header (`HeaderAccountLink.jsx`) and mobile menu show Sign in or Sign out accordingly, and a hidden placeholder avoids layout shift while loading. A failed sign-out keeps the user signed in and shows an alert. Duplicate requests are ignored. `AuthPanel` uses the same store. The session cookie remains HttpOnly and no tokens are exposed.
- Fixed mojibake in the hero and services text. Header CTA relabelled "Book Appointment". Findings are in `docs/REFERENCE_DESIGN_AUDIT.md`; pages were not visually verified at desktop width.
- Read-only seed preflight completed against `the_cut` (no `--apply`). Atlas connection works; plan is 6 service inserts and 4 barber inserts with no ambiguity or warnings. No database writes.
- Checks: `npm test` 232 passed across 18 files; lint 0 errors and the existing HeroSection warning; `npm run build` passed. Live in browser: signed-out state shows Sign in (desktop and mobile list). Signed-in, sign-out success/failure and protected-route behavior were tested only with mocked fetch (new `session-store.test.js`), not with a real login (no test credentials/verified account used).

## Phase I dashboards, image storage and pictures (2026-10-29 to 2026-10-30)

Status labels: **BUILT** = implemented, covered by automated tests, lint and build passed. **LIVE-VERIFIED** = also exercised by a real person or in a browser. Nothing below is marked LIVE-VERIFIED unless stated.

| Area | Units | Status |
|---|---|---|
| Foundation: guards, shell, TOTP pages, admin seed | I-1 to I-4 | BUILT; admin and Super Admin sign-in and TOTP confirmed working by the owner |
| Public data from MongoDB with file fallback and tag revalidation: services, packages, barbers, holidays, business settings | I-5 to I-7, I-15 to I-17 | BUILT; editors for services, packages, barbers and settings exist at `/admin/*` |
| Customer dashboard: appointments (reschedule and cancel, 24 h rule), profile, password, sessions, avatar, deletion request | I-8 to I-10 | BUILT; I-8 and I-9 checked live with dummy accounts; avatar upload not live-verified |
| Admin bookings: today, all bookings (search, filter, paging), walk-in | I-11 to I-13 | BUILT; **not** exercised live as an admin |
| Customers list (limited, read-only) | I-14 | BUILT; not exercised live as an admin |
| Gallery manager | I-19 | BUILT; not exercised live |
| Contact messages (read, status, delete: Admins may delete since 2026-10-30) | I-20 | BUILT; not exercised live |
| Operational reports (counts and rates, no money) | I-22 | BUILT; not exercised live |
| Image storage moved from ImgBB to Cloudinary (adapter, folders, 4 MB, CSP, fixed sizes, check script), browser resize, slot overrides, delivery guards | C1, C2 | BUILT; `npm run check:cloudinary` printed SUCCESS once the correct cloud name was used; the owner still has to set the correct `CLOUDINARY_CLOUD_NAME` in `.env`; uploads not live-verified |
| Pictures for services, barbers and packages (upload, crop, replace, remove, cleanup) | D1 | BUILT; not exercised live |
| Dashboard CRUD audit | docs/DASHBOARD_CRUD_GAPS.md | DONE (read-only) |
| Super Admin controlled Admin capabilities: engine (catalog, grants storage, enforcement in actions, API routes and pages, coverage guard) | P1 | BUILT, not live-verified; all switches default on |
| Super Admin permission screen `/super-admin/permissions` (route and action switches, review, save with authenticator code, audit); sidebar, buttons and settings follow the switches | P2 | BUILT, not live-verified |

| Barber picture fix: root cause found, picture columns in admin lists, clearer save flow with leave-page warning and "use and save" on edit, suggested descriptions, "Shared sample image" label only on shared images | Fix 2026-10-30 | BUILT; public site verified in a browser; the pending portrait is attached to Daniel Carter (owner's choice, 2026-10-30) and shows on the public home page; admin dashboard not verified |

Checks last run (2026-10-31, after D2a): `npm test` 747 passed in 89 files, lint clean, build compiled. Older line (after D1, 2026-10-30): `npm test` 642 passed in 79 files; `npm run lint` clean; `npm run build` passed. Production-build spot checks: public pages 200, admin pages 404 for guests and customers, uploads refused for guests.

Not built yet: archive, restore and hard delete (D2); the Super Admin permission-management system (designed, waiting for the owner's go-ahead, units P1 and P2); Super Admin units I-23 to I-27; hardening I-28 to I-30; products; review moderation (I-21, skipped: no reviews exist). Known limitations: admin screens untested live; no QR code for TOTP enrolment (a key is shown); the step-up (recent TOTP) rule for no-show is not enforced; the hero image shows locally but the live site problem is still undiagnosed.

- 2026-10-30 Phase 1 live check as Super Admin: 19 pages OK, barber pictures show in admin list and edit form; fixed the misleading "Bookable" badge for barbers without hours. Admin-role behaviour still not live-verified.

- 2026-10-30 Admin switches are default deny (overview only until saved); current set saved first (26 on). Live-verified as the real Admin through the Super Admin screen: View off, Edit off, all off, restored (docs/TESTING.md). Open: Site images switch never takes effect (bug), denied pages return HTTP 200 with the 404 view.

- 2026-10-30 Fixed both live-test findings: Site images switch now effective (group without a view switch depends only on its own switch); revoked Admin pages return a real HTTP 404 (admin layout checks the page switch via the proxy's x-pathname header). 712 tests, lint, build pass; verified live as the Admin; all 26 switches restored on.

- 2026-10-31 D2a built on branch feature/d2-archive-restore: archive and restore for services, packages and barbers (shared `lib/catalog/archive.js`, 6 new default-off switches, Active/Archived tabs, read-only archived records, barber block with upcoming bookings, seed and public readers cannot revive archived records). 747 tests, lint, build pass. (Later live-verified, committed and pushed; see the next entry.)

- 2026-10-30 D2a live-verified with the real Super Admin and Admin (docs/TESTING.md): archive, restore, barber block, read-only archived records, public hiding, per-switch isolation. All 32 switches on, data intact. Committed (`1d16e36`, `7274500`) and pushed on feature/d2-archive-restore.

- 2026-10-31 Housekeeping: branch report (remote has no main), docs drift fixed (NEXT_TASK, PROGRESS, AI_HANDOFF, CLAUDE.md rewritten under 60 lines, ROLE_PERMISSIONS naming), hero image diagnosis (not reproducible locally), test-data list, live-test checklist. No code changed.

- 2026-10-31 Walk-in fix on feature/live-fixes: error handling, double-submit protection, safe server-error logging. 756 tests, lint, build pass. Walk-in saves and shows in Today's bookings (live, real Admin).

- 2026-10-31 Stage B (QA fixes) on feature/qa-fixes: reminder job route, booking refusal messages, CSP hashes for the toast library, walk-in hardening merged. 767 tests, lint, build pass. See docs/QA_REPORT.md.

- 2026-10-31 Stage C booking emails on feature/booking-emails: shared branded layout, 12 events, calendar files, mail log with idempotency and retry, Email log screen with Resend (two new default-off switches, 34 in all), walk-in email field, dev preview page. 827 tests, lint, build pass. See docs/EMAIL.md.

- 2026-10-31 Stage D availability control on feature/availability-control: one availability function with a reason for every time, time blocks (`timeBlock`), barber "accepting bookings" pause, service "bookable" switch, `/admin/schedule` (day and week schedule, block time, blocked list, accepting control), dates endpoint, booking page with disabled states. Five new default-off switches (39 in all). Mandatory rule kept: nothing ever cancels or changes an existing booking; a block over a booking is refused and lists it. 849 tests (plus one opt-in live race test, skipped by default), lint, build pass; live-verified as Super Admin; parallel race on the throw-away database passed (1 of 8 wins). See docs/AVAILABILITY.md.

- 2026-10-31 Stage E (booking gaps) on feature/booking-complete: docs/BOOKING_GAPS.md (what exists, what was built, ten proposals). Built two S items: a reschedule keeps the booking's original names, prices and total; "Book again" on visit history. Not verified live.
