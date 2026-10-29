# AI handoff

Read CLAUDE.md and docs/AI_HANDOFF.md, then continue from "Where I stopped".

**Where I stopped:** Stage 1a complete. **Next step:** Stage 1b.

## Navbar session, design audit and preflight (2026-10-29)

- Navbar sign-in/out is now driven by the real Better Auth session. `src/features/auth/session-store.js` mirrors `GET /api/auth/get-session` and `POST /api/auth/sign-out`. The header (`HeaderAccountLink.jsx`) and mobile menu show Sign in or Sign out accordingly, and a hidden placeholder avoids layout shift while loading. A failed sign-out keeps the user signed in and shows an alert. Duplicate requests are ignored. `AuthPanel` uses the same store. The session cookie remains HttpOnly and no tokens are exposed.
- Fixed mojibake in the hero and services text. Header CTA relabelled "Book Appointment". Findings are in `docs/REFERENCE_DESIGN_AUDIT.md`; pages were not visually verified at desktop width.
- Read-only seed preflight completed against `the_cut` (no `--apply`). Atlas connection works; plan is 6 service inserts and 4 barber inserts with no ambiguity or warnings. No database writes.
- Checks: `npm test` 232 passed across 18 files; lint 0 errors and the existing HeroSection warning; `npm run build` passed. Live in browser: signed-out state shows Sign in (desktop and mobile list). Signed-in, sign-out success/failure and protected-route behavior were tested only with mocked fetch (new `session-store.test.js`), not with a real login (no test credentials/verified account used).

**Updated:** 2026-10-29

## MongoDB seed preflight connectivity follow-up (2026-10-29)

- Confirmed without displaying values that `NODE_ENV` was `development`, `MONGODB_URI` was present, `MONGODB_DB_NAME` was present, and the effective database was exactly `the_cut`.
- Installed MongoDB Node driver is 7.7.0. Its `serverSelectionTimeoutMS` applies after MongoDB `mongodb+srv` SRV/TXT lookup; driver source awaits DNS resolution first, so that option alone does not bound the complete `connect()` call. This explains how the prior attempt could wait past the configured server-selection period.
- Non-destructive DNS diagnostics timed out for the configured MongoDB SRV/TXT lookup and a public DNS control lookup. This runtime's DNS/network path is currently not completing external DNS. This does not establish an Atlas IP allow-list or authentication failure; those were not reached/verified.
- Added seed-only Mongo options (`connectTimeoutMS: 5000`, `serverSelectionTimeoutMS: 8000`, `socketTimeoutMS: 12000`, `timeoutMS: 15000`) and a 15-second hard watchdog for `MongoClient.connect()`. Shared application Mongo defaults remain unchanged. Connection failures use sanitized categories and never print error messages, URI, or credentials.
- Confirmed the no-`--apply` path reads only `service` and `barber`; writes are only reachable in the guarded apply branch. Re-ran the read-only preflight: it resolved `the_cut`, then exited at the 15-second deadline with a sanitized DNS/server-selection message. It did not complete collection reads. No seed was run and no database data was modified.
- Verification: focused tests passed (7/7); `npm.cmd test` passed (228 tests/17 files); lint passed with 0 errors and one existing `HeroSection.jsx` warning; `npm.cmd run build` passed; syntax checks passed.
- Next action: restore external DNS/network access for this runtime, then rerun the no-flag read-only preflight. Do not use `--apply` until a separate user authorization.

## Seed initialization follow-up (2026-10-29)

- `scripts/seed-booking.js` failed because it requested the CommonJS `@next/env` package's `loadEnvConfig` as a named ESM export. It now uses the package default export through `src/lib/booking/load-seed-environment.js` and explicitly asks `@next/env` to load development files when `NODE_ENV=development`. Focused tests cover the interop shape and mode argument.
- Investigated `MODULE_TYPELESS_PACKAGE_JSON` separately. Node v24.21.0 emits this advisory because project `.js` modules use ESM syntax while the root package has no `type` field. Adding root `"type":"module"` could change execution for Next configs and scripts, so it was left unchanged; the warning is non-fatal and remains.
- `npm.cmd test`: 227 passed across 16 files. `npm.cmd run lint`: 0 errors, one existing `HeroSection.jsx` warning. `node --check` passed for the seed entry, loader helper, and test.
- Confirmed the default branch only reads `service` and `barber`; `applyBookingSeed` is called only when `--apply` is present. Ran the no-flag preflight with development mode: it resolved the target as `the_cut` and stated read-only mode, but the Mongo connection did not return. The process was interrupted before collection results; no write mode was used and no database changes occurred. Do not treat service/barber data as inspected.
- Next: diagnose why the Atlas connection is pending, then rerun the no-flag read-only preflight after connectivity is available. Do not use `--apply` without a separate explicit authorization.

## Latest update — approved booking catalog and seed guard (2026-10-29)

- User approved Haircut $25/30m; Beard Trim $15/20m; Shave $20/30m; Hair Color $60/60m; Hair Treatment $40/45m; Combo (Haircut + Beard) $35/45m (USD before tax). `src/config/booking-services.js` is shared by display and seed plans. Booking request schemas reject client price/duration fields; the repository reads current Mongo service fields, requires a positive safe integer price, and snapshots price/duration into the booking. Historical snapshots are not changed by service updates.
- Active target database is identified by the user as `the_cut`. App DB selection is `MONGODB_DB_NAME` if set, otherwise the URI database. `src/lib/db/mongo-config.js` now centralizes the app's existing MongoClient options and database selection. No environment values were read or printed; the target was not independently queried.
- `scripts/seed-booking.js` now defaults to a read-only preflight and safely loads the existing `.env` at execution time via `@next/env`. It requires `NODE_ENV=development`, resolves exact database `the_cut`, and requires `--apply` plus `ALLOW_THE_CUT_BOOKING_SEED=YES_I_REVIEWED_THE_CUT_DATABASE` for writes. It only reads `service`/`barber`, plans targeted upserts, aborts before writes on ambiguous legacy services or identity mismatch, preserves existing barber schedules, and creates no assumed schedules. It does not touch auth/email/user/session/verification/booking collections. The seed was not run.
- Existing four barber identities are retained. Real names, availability, weekly schedules, holidays, and working hours still require user confirmation before production booking. Existing app auth/roles and Next.js Route Handler architecture are unchanged; no Express server or role migration was added.
- Exact dry-run and write PowerShell commands are in `docs/BOOKING_RULES.md`. Phase H and Phase I are not started.
- Verification (2026-10-29): `npm.cmd test` passed (225 tests/15 files); `npm.cmd run lint` passed with 0 errors and one existing `HeroSection.jsx` warning; `npm.cmd run build` passed and compiled all routes. `node --check` passed for the seed utility and seed core. No database, SMTP, upload, live sign-up, or browser booking test was run.

## Historical Phase G implementation checkpoint (2026-10-28) — superseded by the 2026-10-29 update above

- The booking API/transaction implementation described in this historical entry remains present; its earlier no-price blocker is superseded by the approved catalog in the 2026-10-29 section above. The database itself is not seeded or verified.
- Historical rule summary from the user's defaults: America/New_York, USD; Monday–Friday 9am–7pm, Saturday 9am–5pm, Sunday 10am–3pm; 15-minute grid; 5-minute cleanup buffer; 60-minute lead time; 30 days in advance; maximum 3 services and 2 active appointments; cancellation/reschedule cutoff 24 hours; pay at shop/no deposit; no-show after 10 minutes with a review flag at 2; Any barber selects the least-booked eligible barber. Holiday defaults and assumption notes are in `src/config/booking.js`.
- Current launch blockers are approved database service rows (the database has not been checked or seeded) and verified real barber schedules; see the 2026-10-29 update and `NEXT_TASK.md`.
- Phase H has not started. Phase I media role-session/ImgBB live checks and Phase K configured Turnstile plus production SPF/DKIM/DMARC/domain verification remain carried over.
- Checks at the 2026-10-28 checkpoint: `npm.cmd test` passed 215 tests across 14 files; `npm.cmd run lint` passed with one existing HeroSection aria warning; `npm.cmd run build` passed and compiled all booking routes. No `.env` values were read or printed; no live email, booking, seed, or browser test was run.

## Resume prompt

Read `/docs/AI_HANDOFF.md` and `/docs/MASTER_PROMPT.md`. Continue from “Next task,” preserve work marked DONE, and use the project-specific overrides. Read other docs when relevant to the task.

## Current status

- Phase A audit: **DONE** — `docs/AUDIT.md`.
- Phase B foundations: **DONE** — tokens, Tailwind mappings, fonts, config, environment validation, baseline headers, and Booking layout fixes.
- Phase C design system: **DONE** — shared primitives/shells, glass/depth recipes, motion runtime, deferred hero canvas, and development-only design-system route.
- Phase D security/data foundation: **DONE-LOCAL with carried-over items (security gate remains PARTIAL)** — Better Auth + MongoDB server foundation, route handler, authorization guard, failed-auth audit/burst markers, explicit TOTP lockout, session-bound step-up proof helper, request hardening, and local security tests exist. Direct logout coverage and external/production checks remain open.
- Phase E public pages: **IMPLEMENTED** — About, Gallery, Pricing, and public Contact route, metadata, robots, sitemap, navigation, and responsive layout. Site facts remain unverified.
- Phase F: **DONE-LOCAL** — auth mail, role-protected ImgBB media adapter/route, and persisted contact form with background mail are implemented and mock-tested. Verification links expire after one hour and are single-use; failure bursts alert at five attempts per IP in ten minutes. One authorized test-labeled delivery attempt timed out without provider confirmation; inbox receipt is unconfirmed. Phase I/K checks are carried forward.
- Phase G status line above supersedes the earlier Phase G NOT STARTED note below.
- Current application: Next.js 16.4.3 App Router, React 19.3.0, JavaScript/JSX, Tailwind CSS 4.
- Backend direction: keep future operations in Next.js Server Actions and Route Handlers. No separate Express server. This is the user-selected project direction.
- Better Auth/DB security foundation: **PARTIAL**. Auth endpoints, pooled MongoDB adapter, session/version authorization, TOTP, auth rate limits, audit events for privileged sessions/denials/failed sign-ins/TOTP/bursts, account lockout, step-up proof, and user-update version bumps for role/status/2FA/password changes exist. `/sign-in` and `/sign-up` use the same-origin API. SMTP delivery, production auth checks, Atlas-backed invalidation, and step-up integration remain open.
- Signup rate limit: five attempts per IP per hour, stored in MongoDB's `rateLimit` collection. A loopback-only development reset utility exists at `scripts/reset-dev-auth-rate-limits.mjs`; it requires `NODE_ENV=development` and `--confirm-dev-reset`. It was not run. See `docs/AUTHENTICATION.md`.

## Exactly where work stopped

Phase F is DONE-LOCAL. Verification mail was skipped because the shared mailer rejected a safe display-name sender address before sending; `after()` suppressed that exception and wrote `auth.email_verification.delivery_failed`. The validator now accepts display-name mailbox syntax while rejecting CRLF, and development auth links/mail origin validation prefer server-side `SITE_URL`. Mock tests pass. One test-labeled email attempt to `MAIL_TO` did not return provider acceptance before timeout; it was not retried, and receipt is unconfirmed. No sign-up, account, or rate-limit operation occurred. Phase I media role sessions and live ImgBB upload remain pending; Phase K configured Turnstile and production SPF/DKIM/DMARC/domain verification remain pending. The Phase G blocker at that earlier point is superseded by the latest handoff section above. Atlas rate-limit counters remain user-managed; do not run the loopback-only reset script against Atlas.

Hydration finding: the reported `/contact` warning is environment-specific. Temp Mail Org injects `data-temp-mail-org` and inline styles into the email field before hydration. A clean Playwright context showed only server-rendered application attributes and no hydration warning. Do not add `suppressHydrationWarning` or change application markup for this extension behavior.

HMR finding: previous browser logs show refused WebSocket connections to `ws://localhost:3000/_next/hmr`. During follow-up, initial port/HTTP probes found no responding server; Next later reported the existing dev server on port 3000 (PID 10204). An attempted second `next dev` selected 3001, then exited after detecting that server's lock. The server served `/contact` with HTTP 200 after a ~16s first compile; its dev log records slow filesystem detection and initial proxy/contact compilation. A clean Playwright reload produced no new console errors/warnings; a browser WebSocket probe to `/_next/hmr` opened. This verifies the endpoint is now healthy and that the earlier refusal coincided with an unavailable/startup interval; the old terminal was not attached, so whether the prior process stopped, restarted, or was still starting cannot be distinguished. No wrong port or proxy fault was found, and no Next config or app code change was made.

Historical preview-only booking inventory superseded by the implemented booking API and repository. Current routes and policy are documented in `docs/BOOKING_RULES.md` and `docs/ROLE_PERMISSIONS.md`.

## Checks and visual status

- `npm.cmd run lint` — passed after Phase D (one existing `aria-hidden` type warning in `HeroSection.jsx`).
- `npm.cmd run build` — passed after Phase D; `/api/auth/[...all]` and the existing pages compiled.
- Current auth UI continuation `npm.cmd test` — 162 tests passed across 5 files, including the generated permission matrix, request-security tests, and in-memory Better Auth logout invalidation; lint and build passed with the existing HeroSection `aria-hidden` warning. JWT/refresh-family tests do not apply to the selected opaque-session design.
- Phase F `npm.cmd test` — passed: 168 tests across 8 files, including mock transport escaping/delivery failure, Better Auth verification expiry, atomic one-time token/replay handling, and the five-failures-in-ten-minutes alert threshold. `npm.cmd run lint` passed with one existing HeroSection warning; `npm.cmd run build` passed.
- Phase F SMTP check — transport authenticated and the provider accepted one clearly labeled test message. No environment values were printed or inspected. Client chunks contained no SMTP variable names or Nodemailer code; auth mail source contains no console/logger calls. Inbox receipt and auth mail flow remain unverified.
- Phase F mock implementation checks — `npm.cmd test` passed (201 tests/11 files); `npm.cmd run lint` passed with the existing `HeroSection.jsx` aria-hidden warning; `npm.cmd run build` passed after network access for the configured Google Fonts. No live browser, ImgBB, or contact email test was run.
- Edge/Playwright on the production build and localhost:3000 — nonce CSP present; inline scripts had nonces and no console errors. `/booking` was checked at 1440, 768 and 375px. Development requires a dev-only style exception for the Next overlay.
- 2026-10-28 HMR follow-up: port 3000 is owned by the Next dev server PID 10204; `/contact` returned HTTP 200 after initial compilation and the `/_next/hmr` WebSocket probe opened. Clean Playwright showed no fresh console warnings/errors and no Temp Mail Org attribute/style. The earlier refusal coincided with a period when the server was not responding; the original terminal was unavailable, so stop versus restart/startup cannot be distinguished. No config change was warranted.
- `npm.cmd audit --omit=dev --offline` — found 0 vulnerabilities in installed production dependencies; re-run online before release for current advisories.
- Production HTTP smoke check: `/`, `/services`, and `/booking` returned 200; `/design-system` returned 404.
- Phase E `npm.cmd run lint` passed with the existing HeroSection `aria-hidden` warning; `npm.cmd run build` passed.
- Edge/Playwright against localhost:3000 and the production build at 3001: `/about`, `/gallery`, `/pricing`, and `/contact` returned 200 at 1440/768/375px without horizontal overflow or page errors. Gallery category filtering and dialog Escape close passed.
- `/robots.txt` and `/sitemap.xml` returned 200; robots disallows `/api/`. The current localhost origin is excluded from sitemap URLs.
- Development HTTP check at `http://localhost:3000/design-system` returned 200.
- Phase C npm install completed and reported 0 vulnerabilities.
- Playwright/Chrome — at 1440, 768, and 375px, the intro begins at or below the header bottom; details/summary use two columns at 1440 and one at 768/375; no horizontal overflow or console errors. Smallest measured booking text was 11px desktop/tablet and 9px mobile progress labels.
- Historical preview-only booking note superseded by the 2026-10-28 Phase G implementation. Booking writes now use authenticated Route Handlers; see the 2026-10-29 handoff.
- Local MongoDB and Better Auth settings were previously exercised through `GET http://localhost:3000/api/auth/get-session` (HTTP 200), which initializes the database and first-use indexes. Signup/session lifecycle and production database behavior remain unverified. SMTP names are present, but verification/reset delivery is not confirmed; no real mail was sent.
- Better Auth DB sessions are selected for this same-origin app; the separate refresh-token requirement is superseded. Auth endpoints have Mongo-backed per-IP rate limits; privileged session creation, permission denials, failed sign-in/TOTP attempts, and burst markers are audited. Nonce CSP is implemented. SMTP alert delivery, audit coverage for privileged field changes, tested DB session invalidation, sensitive-operation step-up integration, trusted-proxy/production-origin review, and the Section 11.1 attack suite remain open; Phase D is not DONE.
- Phase C dependencies (`class-variance-authority`, `clsx`, `tailwind-merge`, `motion`, `gsap`, `lenis`, `three`, and `@react-three/fiber`) installed; npm reported 0 vulnerabilities.

## Carried-over tasks

- **Phase I:** test media upload with real role sessions and perform a live ImgBB upload test.
- **Phase K:** test Turnstile in a configured deployment; configure and verify production SPF/DKIM/DMARC and domain verification.

## Next task

Historical Phase G blocker note superseded by the latest handoff at the top of this file. Phase G routes and booking operations are implemented locally; approved service prices and verified roster/schedules remain launch blockers. Phase H has not started.

**Latest continuation update (2026-10-28):** Fixed the mail sender validator to accept safe display-name addresses and aligned development auth/mail origin selection to server-side `SITE_URL`. Added tests for queued sign-up delivery, unverified sign-in resend, one-hour token lifetime, one-time redemption/replay, escaping, redacted delivery failure, both contact emails, and persistence-before-mail failure. `npm.cmd test`: 207 passed; lint: 0 errors with one existing HeroSection warning; build passed. Client chunk scan found no SMTP/ImgBB secret names, Nodemailer, or `deleteUrl`. One real test-labeled delivery attempt to `MAIL_TO` timed out without confirmed provider acceptance and was not repeated. No sign-up, account, or rate-limit operation occurred. Temporary script/loader removed. Phase F DONE-LOCAL; Phase I/K carryovers and Phase G booking questions are documented. See `NEXT_TASK.md` and `docs/SECURITY.md`.

## File map

- `src/app/` — root layout, Home, About, Services, Gallery, Pricing, Contact form, Booking preview, metadata routes.
- `src/app/design-system/page.js` — development-only shared component preview; production returns 404.
- `src/config/` — site metadata, route/anchor registry, navigation, permission map, validated server environment.
- `src/styles/tokens.css` — shared CSS palette and Tailwind theme aliases.
- `src/app/globals.css` — shared component recipes and responsive styles.
- `src/components/` — layout, UI primitives, and small animation wrappers.
- `src/components/three/` — deferred decorative R3F hero field; never business UI.
- `src/lib/motion/` — shared motion durations, easing curves, and reveal variants.
- `src/lib/auth/security-events.js` — pseudonymized auth identifiers and signed, session-bound recent-TOTP proof helpers.
- `src/lib/auth/email-verification-tokens.js` — HMAC token hash registration and atomic one-time consumption.
- `src/lib/auth/failure-bursts.js` — ten-minute failure window and thresholded alert queue.
- `src/lib/mail/mailer.js` — server-only Nodemailer transport for verification links and failed-auth alerts.
- `src/lib/mail/mailer-core.js` — transport-injected mail content and secret-safe delivery failure handling.
- `src/lib/storage/` — ImgBB adapter, image signature/processing policy, and Mongo Media record/service.
- `src/lib/contact/` — signed form ticket, strict form policy, optional Turnstile verifier, and ContactMessage model.
- `src/features/` — landing, services, and preview-only booking modules/data.
- `src/features/marketing/` — shared public-page hero, illustrative gallery data, filter, and dialog.
- `docs/AUDIT.md` — Phase A code audit and prioritized fix plan.
- `docs/BOOKING_PAGE_AUDIT.md` — Booking reference and browser review record.
- `docs/DECISIONS.md`, `docs/SECURITY.md`, `docs/ROLE_PERMISSIONS.md` — current architecture/security choices and permission map.

## Key decisions and conventions

- JavaScript/JSX only; no `.ts`/`.tsx` or TypeScript configuration.
- Next.js Server Actions and Route Handlers are the planned backend boundary; do not add Express.
- Better Auth only; Phase D auth foundation is partial. `/sign-in` and `/sign-up` UI exist; business operations remain unimplemented.
- `src/config/routes.js` owns live URL/anchor values and public access entries. `src/config/navigation.js` owns navigation labels/paths. `src/config/permissions.js` is the role capability source; `src/lib/auth/authorization.js` enforces it for future server operations.
- `src/config/env.js` is server-only and Zod-validates `NODE_ENV`, site/auth URLs, and server secrets. Do not put secrets in `NEXT_PUBLIC_*`.
- `/design-system` is development-only, excluded from public navigation, and returns 404 outside development.
- Services, barbers, reviews, prices, availability, and hours remain illustrative or unverified. The booking calendar collects preferences only.
- Preserve existing user asset deletions and untracked assets. Do not restore starter SVGs or overwrite existing screenshots.

## Environment and commands

- Environment variable names include `IMGBB_API_KEY` (server-only), optional paired `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and the SMTP names documented in `.env.example`. Resend SMTP is selected. Do not inspect or print local `.env` values. One transport smoke message was accepted earlier; inbox receipt and auth-flow delivery remain unverified.
- Install: `npm.cmd install`.
- Dev: `npm.cmd run dev` (project server uses port 3000).
- Lint/build: `npm.cmd run lint`, `npm.cmd run build`.
- Tests: `npm.cmd test` runs Vitest; current suite covers permission defaults and session-version comparisons. Playwright dependency is installed; no persistent browser auth suite exists.
- Google font imports are self-hosted by Next at build time and require build-time access to Google Fonts unless cached.

## Known issues and design tokens

- Need verified booking policies, staff identities, authentic reviews, approved card photography, business contact/hours, and deployment-origin/trusted-proxy validation for the implemented nonce CSP.
- Current principal tokens: background `#041018`, surface `#071923`, raised surface `#0a2029`, border `#174452`, cream text `#f2e8d9`, muted `#9daeb0`, gold `#dba663`, light gold `#f0c487`.
- Display font: Cormorant Garamond. UI font: Manrope. Both use `next/font` with Latin subsets and `display: swap`.
- Glass sizes: 10/16/22px blur with opaque fallback; depth levels use named shadow tokens. Tilt is capped at 4 degrees and reduced-motion safe.
- Smooth scrolling loads Lenis + GSAP/ScrollTrigger after idle and shares one GSAP ticker. R3F gold dust is home-only, deferred until idle/in-view, and skipped for reduced-motion/low-power devices.

## Seed applied (2026-10-29)

- With the user's explicit "Apply seed" authorization, `npm run seed:booking:dev -- --apply` ran against `the_cut` with the documented opt-in: 6 service and 4 barber inserts, completed without error. Existing schedules and booking snapshots were untouched. Rerunning the read-only preflight now plans only `update` rows for the same 10 records (existing, idempotent). Collection values were not independently read back.
- Barbers have empty schedules, so no availability exists. Booking stays disabled for production until real names, schedules, holidays and hours are confirmed.

## Stage 1a done (2026-10-29)
- Fixed `aria-hidden="true hiden"` typo in `HeroSection.jsx` (the lint warning); removed a duplicated header CSS block; added `--error-soft` token replacing two hardcoded colors; updated stale statuses in REQUIREMENTS, DECISIONS, IMPLEMENTATION_PLAN.
- Risky/open, not changed: root `MASTER_PROMPT.md` is 0 bytes (delete if unused); hero says "DHAKA · BANGLADESH" vs New York; pricing tier content differs from the approved catalog (Stage 1b); `src/lib/mail/mailer-core.js` has literal colors in email HTML (acceptable).
- **Where I stopped:** Stage 1a complete. **Next step:** 1b (single source of truth for services/prices; seed accepts `_dev`/`_test` plus existing `the_cut`, per user's choice).
