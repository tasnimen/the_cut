# Database outline

## Current implementation update (2026-10-29)

The old candidate-collections and “do not add booking data” statements below describe an earlier planning stage and are superseded here. The application uses the MongoDB Node driver 7 through `src/lib/db/mongo.js`. It reads `MONGODB_URI` and selects `MONGODB_DB_NAME` when configured; otherwise the driver uses the database encoded in the URI. `src/lib/db/mongo-config.js` is shared by the app and seed utility so their connection options/target selection do not diverge.

The user identifies the existing database as exactly `the_cut`. This task did not read environment values, connect to MongoDB, run a dry run, or write data. The seed refuses a resolved database name other than `the_cut`; it does not create/switch to `selon_dev` or another database.

Phase G uses these collections and indexes:

- `service`: stable slug, public name/description, duration, integer USD `priceMinorUnits`, active status, timestamps. Current approved values are documented in `BOOKING_RULES.md` and shared by `src/config/booking-services.js`. Booking rejects prices that are unset, zero, negative, fractional, or unsafe.
- `barber`: stable slug/name, service slugs, weekly schedule, breaks, days off, active status. Existing schedules are preserved by seed updates; new barber records have empty schedules and are not available until schedules are deliberately configured.
- `booking`: customer-owned record, server-derived service snapshots, barber, UTC start/end, status, price snapshot, consent and reminder metadata. Current service-price edits do not update existing snapshots.
- `bookingSlot`: one unique `(barberId, slotStart)` row for each 15-minute occupancy segment including the cleanup buffer, claimed transactionally to stop overlap races.
- `bookingUserLock`: unique user id row written in the booking transaction to serialize concurrent creates when enforcing the per-user active-booking cap.

The seed reads only the `service` and `barber` collections for a read-only preflight. Actual writes require development mode, the exact `the_cut` target, `--apply`, and `ALLOW_THE_CUT_BOOKING_SEED=YES_I_REVIEWED_THE_CUT_DATABASE`. It only upserts intended service/barber fields; it never drops collections or touches user/session/verification/email/booking/history/settings collections. It aborts the full plan before writes when a legacy service alias or identity mismatch makes matching ambiguous. See [booking rules and exact PowerShell commands](BOOKING_RULES.md).

**Status: MongoDB connection and auth/security indexes exist; Phase G service, barber, booking, bookingSlot, and bookingUserLock persistence is implemented locally. The `the_cut` database was not inspected or seeded by the 2026-10-29 task.**

| Collection | Candidate contents / access pattern | Candidate indexes / safeguards |
|---|---|---|
| `users` | Identity, normalized email, password hash or external auth identifier, role, profile, timestamps | Unique normalized email; role enum; never return credential fields |
| `services` | Public name/details, duration, price, active flag, display order | Active/display order query; validate nonnegative price and duration |
| `barbers` | Staff profile, active state, service eligibility, schedule references | Active/display order; restrict staff-only fields |
| `appointments` | Customer, barber, service snapshot/reference, start/end, status, timestamps | Query by customer/date and barber/date/status. Double-book protection design must be concurrency-safe and tested; a simple pre-check is insufficient. |
| `reviews` | Customer, appointment reference if required, rating, text, moderation status | Bounded pagination by status/date; enforce review policy and ownership |
| `gallery` | Public image URL/provider identifier, alt/caption/category/order | Category/order; store metadata and URLs, not binaries |
| `businessSettings` | Hours, timezone, contact details, cancellation/booking rules | Single controlled record; tightly authorized writes |
| `auditLogs` | Actor, action, target, timestamp, safe metadata/result | Actor/time and target/time indexes; restrict reads and avoid secrets/PII payloads |
| `products` | Only if shop inventory behavior is approved; catalog fields/stock | Active/category/order; stock change validation |
| `loyalty` / `offers` | Only if customer program policy is approved | Customer/date; prevent duplicate redemption per defined policy |

Store money as integer minor units with currency metadata (currency still to confirm). Store dates as UTC instants and apply the documented business timezone for display and opening hours. Define lifecycle/status values and snapshot fields only after booking, price-change, cancellation, and reporting rules are agreed.

## Implemented Phase D foundation

- `src/lib/db/mongo.js` lazily creates one pooled server-only MongoDB client and provides the configured database.
- First auth initialization creates a unique `user.email` index, unique `session.token` and `rateLimit.key` indexes, TTL indexes on session and verification expiry, and audit query indexes. This behavior has not been run against a live Atlas database.
- Better Auth owns its `user`, `session`, `account`, `verification`, and `twoFactor` collections through its Mongo adapter. The app adds only an append-only `auditLog` collection in this phase.
- Do not add booking/service/barber models or persistence until the documented business inputs are confirmed.

## Booking integrity

At booking and rescheduling, the API revalidates service duration, barber eligibility, working hours, breaks, days off, lead time, horizon, and overlap at write time. Booking and quarter-hour slot claims use MongoDB transactions and the unique `{ barberId, slotStart }` index. Concurrent repository tests prove one of two identical mock attempts is rejected. Atlas transaction/session integration remains unverified; public availability alone is never a reservation.

## Operations

Bound and paginate list queries; set sensible connection pool limits; validate every write at runtime; minimize duplicate PII; document retention/deletion and backup restore. Atlas tier limits and point-in-time recovery availability must be checked against the chosen plan before deployment. See [backup status](BACKUP_RECOVERY.md) (to be created during operations planning).
