# Booking rules

**Status:** Local rules and approved catalog are implemented. The `the_cut` database has not been inspected or seeded by this task. Real barber schedules and availability remain unconfirmed, so production booking must stay disabled until they are reviewed.

## Approved services

Prices are USD before tax. Server-side collection records are authoritative. The browser never submits prices or durations, and a booking fails closed if the selected database service has a missing, non-integer, unsafe, zero, or negative price.

| Service slug | Service | Price | Duration |
|---|---|---:|---:|
| `haircut` | Haircut | $25 | 30 minutes |
| `beard-trim` | Beard Trim | $15 | 20 minutes |
| `shave` | Shave | $20 | 30 minutes |
| `hair-color` | Hair Color | $60 | 60 minutes |
| `hair-treatment` | Hair Treatment | $40 | 45 minutes |
| `combo` | Combo (Haircut + Beard) | $35 | 45 minutes |

New bookings copy the current service name, slug, duration, price, and currency into their own immutable service snapshots. Updating the current service record does not rewrite historical booking snapshots.

## Scheduling and lifecycle

- Business timezone: `America/New_York`; currency: USD.
- Shop hours: Monday–Friday 9:00 AM–7:00 PM; Saturday 9:00 AM–5:00 PM; Sunday 10:00 AM–3:00 PM.
- Availability uses a 15-minute grid, rounds each service duration up to that grid, and reserves an additional 5-minute cleanup buffer.
- Minimum lead time: 60 minutes; advance horizon: 30 calendar days; maximum 3 services per booking; maximum 2 active bookings per customer.
- Cancel/reschedule is available until 24 hours before appointment start. Payment is at the shop; deposits and online payment are disabled.
- Any barber chooses the eligible barber with the fewest bookings on that date; ties use barber name. Barber availability comes only from each barber's persisted weekly schedule, breaks, and days off.
- No-show may be marked by an authorized admin after the 10-minute grace period. Two no-shows flag the account for admin review; no automatic punishment is applied.
- The callable reminder worker targets 24 hours before the appointment and skips a reminder if that time has already passed.

Holiday switches and exceptions are in `src/config/booking.js`. The real barber names, availability, weekly schedules, days off, holidays, and opening hours must be confirmed before production booking is enabled. New barber seed records have empty schedules, so they expose no availability until schedules are deliberately configured.

## Database seed safety

- Existing target database: `the_cut`. The script uses the same `MONGODB_URI` plus optional `MONGODB_DB_NAME` precedence as `getMongo()` and refuses every database except the exact `the_cut` name.
- `.env` is loaded by `@next/env`; do not print or copy its values. Run only with `NODE_ENV=development`.
- No flags means read-only preflight/dry run. Writes require `--apply` and `ALLOW_THE_CUT_BOOKING_SEED=YES_I_REVIEWED_THE_CUT_DATABASE`.
- The preflight reads only `service` and `barber` names/identifiers/schedule fields. If a legacy or conflicting service/barber identity is ambiguous, it aborts before any write. It does not touch user, session, verification, account, email, booking, or settings collections.
- Service changes are targeted `$set` operations on exact stable slugs; inserts use `$setOnInsert`. Barber changes only add the approved service slugs; existing weekly schedules, breaks, days off, and all unrelated records are preserved. Newly inserted barber records have no assumed schedule. Booking history and price snapshots are never updated.
- The seed script is not run by the implementation task. Running any write can change current service prices/durations shown by the application.

The command loads `.env`/`.env.local` from the project working directory through `@next/env`; the secret values remain process-only and are not printed. PowerShell dry-run:

```powershell
$env:NODE_ENV = 'development'
npm run seed:booking:dev
Remove-Item Env:NODE_ENV
```

After reviewing the output and accepting the warning that this affects the existing `the_cut` database, explicit write command:

```powershell
$env:NODE_ENV = 'development'
$env:ALLOW_THE_CUT_BOOKING_SEED = 'YES_I_REVIEWED_THE_CUT_DATABASE'
npm run seed:booking:dev -- --apply
Remove-Item Env:ALLOW_THE_CUT_BOOKING_SEED
Remove-Item Env:NODE_ENV
```

The write command has not been executed. If preflight reports ambiguity, stop and reconcile the intended existing service/barber record before trying again.
