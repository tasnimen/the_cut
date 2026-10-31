# Booking emails

Built in Stage C (2026-10-31). All booking mail goes through one layer: templates, a delivery function with a log, and the hourly job. Transport and sender come from the existing SMTP settings (`SMTP_*`, `MAIL_FROM`, `MAIL_TO`).

## Events
| Event | To | When | Calendar file |
|---|---|---|---|
| `confirmed` | Customer | A booking is confirmed (online bookings are confirmed on creation; the shop confirming a pending one) | Add or update |
| `received` | Customer | A booking is created as pending (used when manual approval exists) | none |
| `walk_in_confirmed` | Customer | A walk-in was entered with an email address (the walk-in form's new optional field) | Add |
| `rescheduled` | Customer | The customer moved the booking; shows old and new time | Update (same UID, higher sequence) |
| `cancelled_by_customer` | Customer | The customer cancelled (receipt) | Cancel |
| `cancelled_by_shop` | Customer | The shop cancelled; optional reason line | Cancel |
| `completed` | Customer | The shop marked the visit completed (thank you, no review link until real reviews exist) | none |
| `no_show` | Customer | The shop marked a missed visit (polite, no charge mentioned) | none |
| `reminder` | Customer | The hourly job, about 24 hours before | Add or update |
| `shop_new_booking` | Shop (`MAIL_TO`), reply-to the customer | A booking was made | none |
| `shop_cancelled_by_customer` | Shop | The customer cancelled | none |
| `shop_rescheduled` | Shop | The customer rescheduled | none |

Every customer email shows: when (Eastern, with ET), services, barber, duration, price before tax paid at the shop, shop address and phone from the settings, the 24-hour policy, and (where it applies) a "Manage your booking" button that goes to `/user/appointments` through the sign-in page. Customer text is escaped; links are http or https only.

## Delivery rules
- **Idempotent:** each email has the key `event:bookingId:role:version` (the version is the booking start time for a reschedule or reminder). The key is unique in the `mailLog` collection, so a retry, a double click or two overlapping jobs never send the same email twice. A rescheduled booking gets a new email for each new time.
- **Never blocks the booking:** sending runs inside `after()`; every error is caught, logged and audited (`mail.delivery_failed`, with the event, the attempt number and an error code only).
- **Log content:** event, booking id, role, a masked address (`s***@example.com`), a keyed hash of the address, status (`queued`, `sent`, `failed`, `skipped`), attempts, the error code (never the provider's text), timestamps, and a small context (customer id, previous start, reason) used to rebuild the email on a retry. Message text is not stored.
- **Retry:** a failed email is tried again after 5 minutes, 30 minutes and 2 hours (four attempts in all) by the hourly job (`/api/jobs/booking-reminders`, see `REMINDERS.md`). Before a retry the booking is checked: an email that no longer makes sense (for example "confirmed" for a booking cancelled meanwhile) is marked `skipped`.
- **Email log screen:** `/admin/email-log` (Super Admin always; Admin only with the switch `emailLog.view`, and the Resend button only with `emailLog.resend`; both default off). Only a failed email can be resent, once per click; a delivered one cannot. Permission `mailLogManageAll`.

## Look at the emails without sending anything
In development open `/dev/email-preview`: every event rendered with made-up data (HTML, plain text, calendar file). The page returns 404 in any other environment.

## Until the sender domain is verified
With the Resend test sender, mail is delivered only to the account owner. Customer emails fail (error code `EMESSAGE`), are logged as failed and retried, and the booking is unaffected. Shop notices to `MAIL_TO` (the owner) are delivered. To reach customers: verify the sending domain (SPF, DKIM, DMARC) at the provider, then change `MAIL_FROM` to an address on that domain. No code change is needed.

## Known limits
- No cancel-reason field exists on the Admin cancel button yet (the template supports a reason).
- No logo setting exists; the header uses the site name from `config/site.js`.
- Checked live: a real delivery (the shop notice reached the owner) and the Resend button. Not checked live: a walk-in confirmation to a real address (see TESTING.md).
