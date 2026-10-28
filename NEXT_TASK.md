# Next task: resolve the Phase G booking-policy blocker

**Status:** Phase F is DONE-LOCAL. Phase G has not started. Keep `/booking` preview-only and do not add a booking API, database write, or availability behavior until the essential business rules below are supplied. Do not add Express; the approved server boundary is Next.js Route Handlers and Server Actions, with Better Auth authorization.

## Current findings

- `/booking` currently collects service, barber, preferred date/time, name, email, and optional phone in client state. Submit only shows a preview disclaimer; it sends and stores nothing.
- The service list is illustrative and has no confirmed durations/prices. There is no verified barber roster or availability data.
- No Express API, booking Server Action/Route Handler, booking Mongo schema/model, or booking persistence exists.
- Permission config has `bookingStart` for every role, `bookingOwn` scoped to signed-in roles, `bookingsManageAll` for ADMIN/SUPER_ADMIN, and `bookingsDeleteAll` for SUPER_ADMIN. `requirePrincipal` enforces Better Auth session, verified email, ACTIVE status, current role/session version, permission, and admin TOTP. No booking operation currently calls it.

## Required decisions from the user

1. Opening hours per weekday.
2. Slot length.
3. Duration of each service.
4. Maximum days in advance a booking can be made.
5. Cancellation and rescheduling cutoff in hours.
6. Maximum active bookings per user.
7. Payment at the shop or online.
8. How barber days off are set.

Service menu/prices, barber identities, business timezone, and actual availability must also be confirmed before customer-facing availability or final booking rules can be represented as real.

## Environment-specific findings

- The contact hydration warning came from Temp Mail Org injecting `data-temp-mail-org` and styles into the email input. Clean Playwright showed the application’s original attributes only and no hydration warning. Do not add `suppressHydrationWarning` or app changes for the extension; use a clean browser context.
- Previous HMR refusals coincided with a period when no responding server was observed. The current Next server was observed on port 3000 (PID 10204); first `/contact` compile completed in about 16 seconds and returned HTTP 200, and a browser WebSocket probe to `/_next/hmr` opened. The fresh clean-browser console had no warnings/errors. The dev log showed a slow-filesystem warning and initial compilation. No port/proxy config change was justified. The original terminal session was unavailable, so whether the old server had stopped, restarted, or was still starting is unconfirmed; current Next output and `.next/dev/logs/next-development.log` were inspected.

## Independent carried-over work

- Phase I: test media permissions with real role sessions and perform a live ImgBB upload.
- Phase K: verify Turnstile in a configured deployment and production SPF/DKIM/DMARC/domain verification.
- Phase D: Atlas/production auth and security checks remain open.

Do not read or print `.env` values. The Atlas `rateLimit` collection is user-managed; do not run the loopback-only reset script against Atlas.
