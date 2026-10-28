# Progress

**Current state: Phases A–E implemented; Phase D is DONE-LOCAL with carried-over items; Phase F is DONE-LOCAL.** Updated 2026-10-28.

## Completed

- Initial planning and reference audit are documented in requirements, architecture, permissions, security, data, design, and implementation-roadmap docs.
- Home (`/`) is implemented as modular sections with shared transparent responsive navigation, hero, service/barber previews, sample review carousel, and footer.
- Services (`/services`) is implemented as a Server Component route using its own photo-led hero, functional client-side service-category filters, shared cards/reviews/footer, and an honest illustrative-menu disclosure.
- Shared navigation/footer destinations are root-qualified so they work from both routes; active route state is passed into the header.
- Homepage service-card actions now lead to the implemented `/services` route instead of the pending booking route.
- The final homepage design is documented in `docs/DESIGN_SYSTEM.md`; reusable component usage and boundaries are described in the new `docs/COMPONENT_GUIDE.md`.
- Service data is visibly disclosed as illustrative; unknown prices, booking behavior, staff details, and reviews are not presented as verified facts.
- Better Auth is installed as the Phase D authentication foundation; the local Mongo-backed handler returned HTTP 200, while email-backed lifecycle and production database verification remain pending.
- Booking (`/booking`) now follows the latest supplied screenshot hierarchy: compact text intro, pill-like step row, three selection columns (service list, no-preference barber, preference calendar/time), then customer details beside a live summary, reviews, and footer. It remains a responsive client-side preview; submission explicitly says nothing was sent or saved. See `docs/BOOKING_PAGE_AUDIT.md`.
- Phase G booking inventory: the preview supports preference selection only. No Express API, booking Route Handler/Server Action, Mongo booking model/schema, or authoritative availability store exists. Permissions define `bookingStart` for all roles, own-booking scope for signed-in roles, ADMIN/SUPER_ADMIN management, and SUPER_ADMIN deletion; Better Auth requires verified active users and admin TOTP for protected operations, but no booking operation currently invokes those checks. Keep the page preview-only.
- Phase G is blocked on the business rules: weekday opening hours, slot length, service durations, max advance days, cancel/reschedule cutoff hours, max active bookings per user, payment at shop or online, and how barber days off are set. Service durations/prices, roster, and availability are also unverified. Do not implement booking writes or invent rules before answers.
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
## Remaining limits

- The user-requested card image is one visibly watermarked scissors image reused across service, barber, and review cards; replace it with approved appropriate photos before representing the cards as real content.
- Current service copy is explicitly illustrative; final service list and prices are not supplied.
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

## Exact next task

Phase F is DONE-LOCAL. Next: Phase I real role-session and ImgBB checks, then Phase K configured Turnstile and production DNS/domain checks. Do not start Phase G before the user provides booking rules: opening hours per weekday, slot length, service durations, maximum days in advance, cancellation/rescheduling cutoff in hours, maximum active bookings per user, payment at the shop or online, and how barber days off are set.
