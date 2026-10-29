# Testing

## Local verification

The project uses Vitest (`npm test`), ESLint (`npm run lint`), and Next.js production compilation (`npm run build`). On Windows, `npm.cmd` may be used from PowerShell. Current Phase G verification results are maintained in `docs/PROGRESS.md` and `docs/AI_HANDOFF.md`.

Booking unit tests use mocked Mongo collections and mock mail transports. They cover trusted server prices, invalid/unset prices, rejected client price/duration fields, historical price snapshots, overlap races, owner scoping, active-booking caps, schedule conflicts, DST transitions, state transitions, seed target/opt-in guards, seed idempotency, and preservation of existing barber schedules. No real SMTP or database service is contacted by those tests.

## Phase G results (2026-10-29)

- `npm.cmd test`: 225 passed across 15 files.
- `npm.cmd run lint`: exit 0, no errors, one existing `HeroSection.jsx` aria-hidden warning.
- `npm.cmd run build`: passed; all booking API routes and the app compiled.
- `node --check scripts/seed-booking.js` and `node --check src/lib/booking/seed-core.js`: passed.
- No seed, live database write, SMTP send, upload, sign-up, or browser booking test ran.

## Seed preflight and opt-in

`npm run seed:booking:dev` defaults to a read-only database preflight. It requires `NODE_ENV=development`, resolves the effective database with the app's `MONGODB_DB_NAME` override / URI database behavior, and refuses unless the result is exactly `the_cut`. The opt-in name/value and exact PowerShell commands are documented in [BOOKING_RULES.md](BOOKING_RULES.md). Actual writes additionally require `--apply` and the explicit opt-in environment value. Do not run `--apply` until the preflight actions and warning are reviewed.

The seed has not been run by this task. No live database write, email, upload, sign-up, or browser booking test was performed.

## Manual verification after user-authorized seed

1. Review the dry-run output and verify its target says `the_cut`; do not reveal the connection URI.
2. Before and after the authorized seed, verify representative user, session, verification, and email-related records remain present. Do not export or display credentials/tokens.
3. Confirm six service records and the approved USD prices/durations in the service collection and `/booking` UI.
4. Confirm booking attempts are rejected if a service record has an unset/invalid price; restore the approved value afterward.
5. With a verified active Better Auth customer session, make a booking and confirm the persisted snapshot uses the database price and duration. Confirm a client-supplied price is rejected.
6. Attempt the same barber/time concurrently and verify exactly one booking succeeds. Verify another customer cannot list/cancel/reschedule that booking.
7. Check cancellation/reschedule cutoff and admin no-show grace behavior using authorized test sessions.
8. Test confirmation/reminder email only in a configured test environment with mock transport or an explicitly authorized test recipient.

Live Atlas transaction/session behavior, real barber schedule accuracy, provider delivery, and visual browser behavior remain unverified.

## Admin seed

Dry run (read-only): `$env:NODE_ENV='development'; npm run seed:admins:dev`. Apply: also set `$env:ALLOW_ADMIN_SEED='YES_I_REVIEWED_THE_DEV_DATABASE'` and add `-- --apply`. Unit tests: `src/lib/auth/admin-seed-core.test.js` (credential rules, guards, plan, no password in messages). The live write has not been run by the assistant (the owner has not set the `SEED_*` values yet).

## Admin TOTP (I-3)

Manual live check once an Admin exists (after `npm run seed:admins:dev`): sign in as the Admin, open `/admin` (redirects to `/two-factor`), enter the password, add the setup key to an authenticator app, save the backup codes, enter the 6-digit code, then sign in again: the sign-in page asks for the code, a wrong code is refused, a backup code works once, and `/admin` opens. Automated coverage is in `src/lib/auth/two-factor-flow.test.js`.

## Services editor (I-15)

Manual check as an enrolled Admin (dev database): open `/admin/services` (six services, order, prices); open one, change the price (for example 25 to 26), save: a toast appears, then `/services` and `/pricing`-linked booking lists show the new price within seconds (restore it afterwards); hide a service and confirm it disappears from `/services`, the home page and `/booking`, then show it again; create `test-service` and confirm a duplicate identifier is refused; sign out and confirm `/admin/services` is a 404; as a customer account confirm `/admin/services` is a 404. Check `auditLog` for `catalog.service.*` events. Automated coverage: `src/lib/catalog/*.test.js`, `src/app/admin/services/actions.test.js`.
