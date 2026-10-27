# Database outline

**Status: MongoDB connection and auth/security indexes implemented and locally exercised through the Better Auth session endpoint; no business data models.** Candidate collections from product requirements; final fields and retention need decisions.

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

At booking and rescheduling, the API must revalidate service duration, barber eligibility, working hours, blocked times, and overlap at write time. The implementation must use a database/transaction or slot reservation strategy appropriate to the selected deployment/Atlas tier and prove simultaneous conflicting attempts cannot both succeed. The precise strategy is an open technical design item; do not treat an availability query followed by insert as safe.

## Operations

Bound and paginate list queries; set sensible connection pool limits; validate every write at runtime; minimize duplicate PII; document retention/deletion and backup restore. Atlas tier limits and point-in-time recovery availability must be checked against the chosen plan before deployment. See [backup status](BACKUP_RECOVERY.md) (to be created during operations planning).
