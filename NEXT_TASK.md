# Next task: configure Phase G booking for launch

**Status:** Phase G is DONE-LOCAL, not live-ready. Phase H has not started. Keep existing booking rules and authorization intact; do not invent prices or real barber availability.

Before enabling bookings:

1. Supply approved prices for the four existing services (`the-signature-cut`, `beard-trim`, `the-hot-shave`, `hair-scalp`). Confirmation currently fails closed until every selected service has a configured `priceMinorUnits` value.
2. Confirm the barber roster, each barber's weekly schedule, lunch breaks, and days off. `scripts/seed-booking.js` includes assumed development roster/schedules and was not run.
3. Confirm the enabled holiday/early-close settings in `src/config/booking.js`.
4. On an isolated development database whose configured database name ends in `-dev`, `_dev`, `-development`, or `_development`, run `npm run seed:booking:dev` only when intentionally seeding. In PowerShell, set `$env:NODE_ENV='development'` first. The script also requires an explicit flag. Never point it at production.
5. Validate transactions and uniqueness on the configured Atlas replica set with approved test accounts before production. No live booking, browser submit, email, or seed test was run in this task.

Implemented routes: public `GET /api/bookings/availability`; verified-user own-scope `GET/POST /api/bookings`; own-scope cancel/reschedule; admin-TOTP no-show marking. Next overall task after booking launch data is supplied: proceed to the documented later project phase (Phase H) without changing Phase I media or Phase K deployment carryovers in this task.

Checks from the current implementation task: `npm.cmd test` — 215 passed across 14 files; `npm.cmd run lint` — zero errors, one pre-existing `HeroSection.jsx` warning; `npm.cmd run build` — see final handoff. No `.env` values were read or printed. No commit was made.
