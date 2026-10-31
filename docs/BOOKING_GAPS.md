# Booking gaps (Stage E)

Compared with an industry-level booking system, from the code as of 2026-10-31. Size: S (hours), M (a day), L (needs a design and the owner's decision). Out of scope without approval: online payment, deposits, SMS, waitlist, recurring bookings.

## Already in place (no work)
Max 3 services and 2 active bookings per customer, 24-hour cancel and reschedule cutoff, phone validation (US numbers, SMS consent needs a phone), rate limits on every booking endpoint, no-show counter with an automatic review flag at the threshold (walk-ins excluded), audit entry for every booking change, price snapshot at booking time, confirmation, reschedule, cancel and reminder emails with calendar files, walk-ins, customer history, operational reports, availability control (Stage D).

## Built in this stage
| Gap | Size | What was done |
|---|---|---|
| Reschedule re-priced the booking at today's service prices and names | S | A reschedule now keeps the booking's original service names, prices and total (`lib/booking/snapshot.js`); only time, barber and duration change. Matches the Stage D rule that a booking's snapshot is never overwritten. |
| No "Book again" | S | Visit history rows have a "Book again" link that opens the booking page with the same services selected (switched-off services are ignored by the page). |

## Proposals (not built; each needs an owner decision)
| Gap | Size | Note |
|---|---|---|
| Reason when a booking is cancelled (customer optional, staff optional, shown in the shop's cancellation email; the email template already supports a reason) | M | Needs a field in the cancel actions, the booking record, the admin buttons and the email call |
| Staff-only booking notes and customer notes to the barber | M | New field, switch, screen changes |
| 24-hour cutoff override by staff, with a required reason | M | New switch and audit detail; today staff can cancel at any time but cannot reschedule for a customer |
| Reschedule rules when a service was switched off or the barber paused after booking: today a reschedule is refused (`service_unavailable`); decide whether an existing booking may still move | M | A business decision first |
| Receipt and calendar file download from "My appointments" | M | The `.ics` builder exists (`lib/mail/ics.js`); needs an owner-scoped route |
| Reschedule form on the user dashboard still uses a plain date input, without the disabled-date calendar of the booking page | M | Reuse `AvailabilityCalendar` |
| Booking confirmation page after booking (today a status line and an email) | M | New route |
| Confirm mode (new online bookings start as pending and need staff approval) | L | State machine already has `pending`; needs policy, screens and emails |
| Favourite barber and "my usual barber" | L | New customer field and UI |
| Real numbers on the overview widgets | M | Reports exist; overview cards need wiring |
