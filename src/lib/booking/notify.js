import "server-only";
import { sendBookingMails } from "@/lib/mail/booking-mail";

// Sends the emails for a booking change (see lib/mail/booking-mail.js: templates, mail log, retries). It never throws
// and never affects the change itself: a failed email is logged and audited. Call it inside `after()`.
// operation: created, walk_in, confirmed, reschedule, cancel_by_customer, cancel_by_shop, completed, no_show.
// customerUserId is whose booking it is (a `walkin:<id>` value for a walk-in).
export async function notifyBookingChange({ db, operation, booking, customerUserId, reason = "" }) {
  return sendBookingMails({ db, operation, booking, customerUserId, reason });
}
