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

## Public catalog (unit I-5, 2026-10-29)

The public site (home, services, pricing, booking list and preselect) reads **services** and **pricing packages** through `src/lib/catalog/source.js`: MongoDB first, the file data (`config/booking-services.js`, `config/pricing-packages.js`) as the fallback.

| Collection | Fields read (allow-list) | Notes |
|---|---|---|
| `service` | `slug`, `name`, `description` (shown as the card text), `durationMinutes`, `priceMinorUnits`, `active`, `displayOrder`, `category` (haircut, beard, shave, color, treatment), `icon` (scissors, beard, razor, sparkle) | Existing documents lack `displayOrder`, `category` and `icon`: missing display fields are filled from the file entry with the same slug (new slugs default to haircut/scissors); order falls back to the file order. A missing or invalid price shows "Price to be confirmed" (never an invented number) and booking stays blocked as before |
| `pricingPackage` (new, empty) | `slug`, `name`, `priceMinorUnits`, `note`, `inclusions[]`, `featured`, `active`, `displayOrder`, `bookingServiceSlugs[]` | Created by the packages CRUD in unit I-16. While the collection is empty the three file packages are shown |

Rules (`lib/catalog/normalize.js`, tested): the database is authoritative once the collection has any document (inactive or invalid documents are hidden, so deactivating all services shows none); the file data is used only when the collection is empty or the read fails; internal fields (`_id`, timestamps) never reach pages.

**Caching:** `unstable_cache` with tags `catalog:services` and `catalog:packages` and a 5-minute safety revalidate. (The installed Next.js docs mark `unstable_cache` as replaced by `use cache`, which needs the Cache Components flag and would change rendering app-wide; migrate later if the flag is adopted.) After any admin save call `revalidateCatalog()` (`lib/catalog/revalidate.js`, uses `revalidateTag(tag, { expire: 0 })`) from the Server Action or Route Handler; the next public request then reads fresh data. A failed query is never cached.

**Outage behavior:** a failed read serves the file data; a 30-second cooldown (`lib/utils/cooldown.js`) stops every request waiting for the 8 s database timeout. The site header uses the same cooldown for its session lookup (it shows the signed-out header while the cooldown is active; authorization itself is unaffected).

**Written by the services editor (I-15):** `slug`, `name`, `description`, `durationMinutes`, `priceMinorUnits`, `currency` ("USD", set on create only), `active`, `displayOrder`, `category`, `icon`, `createdAt`, `updatedAt`. Editing a legacy document (seeded before display fields existed) stores its `displayOrder`, `category` and `icon` permanently.

**Written by the packages editor (I-16), collection `pricingPackage`:** `slug` (unique), `name`, `note`, `priceMinorUnits`, `inclusions[]`, `featured`, `active`, `displayOrder`, `bookingServiceSlugs[]`, `currency`, `createdAt`, `updatedAt`. The collection is created by "Import the current packages" or the first new package; until it has a document the public pricing page uses the file packages.

## Closed dates and public team profiles (unit I-6, 2026-10-29)


**`barber`** gains optional public-profile fields: `publicProfile` (boolean, default off), `role`, `focus`, `displayOrder`. The home team section shows a barber with name, role and focus **only** when `publicProfile: true` and `active`; otherwise the generic nameless file profiles (`config/team-profiles.js`) stay, because the real team is not confirmed. Only `slug`, `name`, `role`, `focus`, `displayOrder` are read for the public site: schedules, breaks, days off, service assignments and timestamps never leave the server. A photo uses the slot `barber-<slug>` when that slot exists in `config/images.js` (otherwise the placeholder). Tag `catalog:barbers`. The schedule fields used by booking are unchanged; the barbers editor is I-17.

**Written by the barbers editor (I-17), collection `barber`:** `slug` (unique, create only), `name`, `active`, `serviceSlugs[]`, `weeklySchedule`, `breaks`, `daysOff[]`, `publicProfile`, `role`, `focus`, `displayOrder`, `createdAt`, `updatedAt`. `BarberRecordSchema` (booking model) accepts the new optional fields.

## Business settings (unit I-7, 2026-10-29)

`siteSetting` (unique `key`) now holds four documents, each `{ key, value, updatedAt, createdAt }`, all read in one cached query by `getBookingConfig()` and `getSiteSettings()` (`lib/catalog/source.js`, tag `catalog:settings`, 5-minute safety refresh, 30-second outage cooldown). The file values stay the defaults when a document is missing or the database is unreachable.

| `key` | `value` | Used by |
|---|---|---|
| `hours` | `{ monday: { open, close }, ... }`; a missing day means closed; a document with no valid day is ignored | booking (`config.openingHours`), contact page, footer |
| `holidays` | flags (`newYearsDay`, `memorialDay`, `independenceDay`, `laborDay`, `thanksgiving`, `christmasDay`, `december24EarlyClose`), `december24EarlyCloseAt`, `additionalClosedDates[]` | booking (availability and creation), contact page |
| `contact` | `phone`, `email`, `streetAddress`, `postalCode` (empty = hidden) | contact page, footer, Maps link |
| `social` | `instagram`, `facebook`, `tiktok`, `x`, `youtube` (https links on each network's own domain only) | contact page, footer |

Every value is validated again when read (`lib/catalog/settings.js`), so a malformed or tampered document cannot publish a script URL, a broken phone link or close the whole shop.

## accountDeletionRequest (I-10)

One document per user who asked the shop to delete their account: `userId` (unique index `account_deletion_user_unique`), `email`, `status` (`pending` or `cancelled`), `requestedAt`, `createdAt`, `cancelledAt`. Nothing is deleted automatically; the admin screen that processes requests comes with the customers unit (I-14). The user's avatar is `user.image` plus a `media` document (`category: "avatar"`, `ownerId`).

## Walk-in bookings (I-13)

A walk-in is a normal `booking` document with `source: "walk-in"`, `createdBy` (the admin's user id) and a synthetic owner `userId: "walkin:<bookingId>"`, which never equals a real user id, so it never appears in any customer's account and no active-booking cap applies. There is no email, `smsConsent` is false and `reminderDueAt` is null, so no reminder or message is ever sent. Online bookings have no `source` field (treated as "online"). No-shows on walk-ins are not counted against anyone.

## galleryItem (I-19)

One document per photo the shop added to the public gallery: `mediaId` (the `media` document that holds the provider's delete address), `title`, `category` (one of the gallery categories), `alt`, `active`, `displayUrl`, `thumbUrl`, `width`, `height`, `createdBy`, `createdAt`, `updatedAt`. Index `gallery_active_created` (`active`, `createdAt` desc). The public site reads active items only (cache tag `catalog:gallery`, 5 minutes, refreshed on every admin change) and only an allow-list of fields. Order is newest first; manual ordering was not built. Maximum 200 photos.

## media (updated for Cloudinary, C1)

New records: `provider: "cloudinary"`, `publicId` (`the-cut/<folder>/<uuid>`, used for deletes), `resourceType: "image"`, `secureUrl`, `width`, `height`, `format`, `bytes`, `folder`, `category` (gallery, products, barbers, services, avatar, banners, slots), `ownerId` (set for avatars), `uploadedBy`, `alt`, `createdAt`. Browsers get `id`, `secureUrl`, size and alt only (`toPublicMediaRecord`), never `publicId`. Older records (ImgBB) have no `provider` and carry `url`, `displayUrl`, `thumbUrl`, `deleteUrl`, `byteSize`; they stay readable and are deleted through the legacy adapter. Features should keep the Media id (as `galleryItem.mediaId` does) and read the address from the record; `galleryItem` and `user.image` still hold a copy of the address for fast reads (C2 reviews this).

## imageSlot (C2)

One document per image slot that an admin pointed at a stored image: `slot` (a key from `config/images.js`, unique index `image_slot_unique`), `mediaId`, `secureUrl`, `alt`, `width`, `height`, `updatedBy`, `updatedAt`. Resolution order for every slot: this override, then a photo placed in `public/images`, then the built-in fallback. Unknown slot keys and untrusted addresses are ignored. Cached with tag `catalog:slots` (5 minutes); pages call `await primeSlotOverrides()` once at the top. The admin screen that writes these (Super Admin, "Site images") is unit I-27; the write helpers (`setSlotOverride`, `clearSlotOverride`) and permission (`mediaSlotsManageAll`) exist and are tested.

## Pictures on service, barber and pricingPackage (D1)

Optional field `image: { mediaId, secureUrl, width, height, alt }`. Records without it keep working (the site uses the slot image or placeholder). `media` documents of category services, barbers or packages gain `attachedTo: { kind, slug }` once attached (a media document can belong to one record only) and `orphaned: true` when its provider delete failed. Unattached uploads older than 24 hours are swept at the next upload. Public pages receive the picture without `mediaId`.

## adminPermission (P1)

One document, `_id: "admin-grants"`: `grants` (`{ "<group>.<action>": boolean }`, the complete set after the last save), `version` (incremented on each save), `updatedAt`, `updatedBy` (user id of the Super Admin). Absent document or key = default (everything on). Read on every guarded Admin call; written only by `saveAdminGrants` (Super Admin). See ADMIN_PERMISSIONS.md.
