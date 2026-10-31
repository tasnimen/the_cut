# Availability control (Stage D)

How a time becomes bookable or not, and what the screens can change. Built on branch `feature/availability-control`.

## The mandatory rule

Turning a barber, a service, a time or "accepting bookings" off, or blocking time, **never cancels, moves, edits or overwrites an existing booking**. Existing bookings keep their service names, prices, barber, date and time (the booking stores a snapshot). Only an explicitly authorised booking action (the booking buttons, with their own switches) can change a booking.

If a block would overlap a pending or confirmed booking, **nothing is blocked**: the screen shows a warning and lists the bookings (customer, barber, time, status). Pausing a barber lists that barber's upcoming bookings afterwards, unchanged.

## One function decides everything

`lib/booking/availability.js` (`loadBookingOptions`, `loadDateStates`) with `lib/booking/rules.js` (`evaluateSlots`). The public booking page, the dates calendar, the booking itself (re-run inside the booking transaction), reschedule, walk-in and the schedule screen all use it, so they cannot disagree. A time is bookable only when all of these hold:

| Check | Reason shown when it fails |
|---|---|
| Not in the past or inside the 60-minute lead time | `past` ("Past") |
| Inside the shop's hours and the barber's own hours, not a holiday or day off, long enough before closing (service time plus 5-minute buffer) | `unavailable` ("Unavailable") |
| Not in the barber's break | `break` ("Break") |
| No booking holds it (`bookingSlot` rows; booked time includes the buffer, for that barber only) | `booked` ("Booked") |
| No active time block covers it (this barber or the whole shop) | `blocked` ("Unavailable"; the reason text is never sent to customers) |
| The barber is accepting bookings that day (`acceptingBookings`, optional `pausedUntil`) | barber state "Not taking bookings" |
| The service is shown and bookable (`bookable` not false) | service shown disabled; the API answers `service_unavailable` |

The API answers `grid` (every time with `available` and `reason`), `slots` (only the bookable ones, as before), `barbers` (each with `state`: available, off, full, paused, and a label), `anyBarber`, and `dateState` (open, full, closed, past). `/api/bookings/availability/dates` gives the state of every date in the 30-day window for the calendar. Both are public, rate limited, `no-store`.

Cancelling, completing, or marking no-show deletes the booking's `bookingSlot` rows, so the time is released at once (this existed before Stage D). "Complete early", "Release time" and "Reopen slot" need no new code path: completion of a started appointment (existing "Complete") and cancel/no-show already release the time; no separate button was added.

## Data

- Collection `timeBlock`: `{ barberId (string | null = whole shop), startsAt, endsAt (UTC Dates), reason (max 200, dashboard only), status "active" | "removed", createdBy, createdAt, removedAt, removedBy }`. Indexes `time_block_range`, `time_block_barber_start`. Unblocking keeps the record with status `removed`. Whole-day blocks run local midnight to midnight in America/New_York (23 and 25 hour days handled). A range is at most 62 days.
- Barber fields: `acceptingBookings` (missing = true), `pausedUntil` (local date, inclusive, or null), `pauseNote` (dashboard only).
- Service field: `bookable` (missing = true). Independent of `active` (hidden) and of archive.

## Screens and switches (all default off; SUPER_ADMIN is never limited; a revoked page is a real 404)

| Switch | What it allows |
|---|---|
| `availability.view` | `/admin/schedule`: day or week schedule per barber (bookings with status colour, blocks, breaks, free time), blocked-times list |
| `availability.block` | Create a block (barber or whole shop, date and times, whole day or a date range, reason); free-time rows link to a prefilled form and to the walk-in page |
| `availability.unblock` | Unblock (confirmation) |
| `availability.barberToggle` | "Stop new bookings" (optional until date and note) and "Resume" per barber |
| `services.bookable` | "Stop bookings" or "Allow bookings" per service on `/admin/services` |

Every change writes an audit entry: `availability.block_created`, `availability.block_removed`, `availability.block_updated` (library only, no screen yet), `availability.barber_paused`, `availability.barber_resumed`, `availability.service_bookable`, `availability.service_not_bookable`. The Server Actions re-check session, role, TOTP and the switch on every call, validate ids and slugs, and are rate limited.

## Public booking page

Calendar with fully booked, closed and past dates visibly disabled (reason in the accessible name and tooltip), legend, "Next available" shortcut, times grouped Morning, Afternoon and Evening, unavailable times muted with a line through, a lock icon and a text reason (`aria-disabled`, never colour alone), earlier times today collapsed into one note, barbers and "Any barber" disabled with a reason, services switched off disabled with a reason, skeleton while loading, error with retry, refresh when the tab regains focus (after 30 seconds) and after a "time was just taken" refusal.

## Not built (named in the plan, deliberately skipped or deferred)

- Editing a block from a screen (the library function `updateTimeBlock` exists and is tested by design but has no screen: unblock and create again).
- Separate "Complete early", "Release time" and "Reopen slot" buttons (see above: the existing Complete, Cancel and No-show already release time; reopening a released slot is simply the time becoming bookable again).
- Server-side revalidation of public pages: the booking page reads availability live (`no-store`), so nothing is cached; the barber and service catalog caches are refreshed with `revalidateCatalog`.
