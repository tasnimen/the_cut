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
