import "server-only";
import { sendBookingCancellation, sendBookingReschedule } from "@/lib/mail/mailer";
import { userIdFilter } from "@/lib/db/user-filter";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Sends the cancellation or reschedule email for a booking the customer just changed. A failure never
// affects the change itself: it is audited (without details) and swallowed. Call it inside `after()`.
// `recipientUserId` is the customer when an admin made the change; it defaults to the acting user.
export async function notifyBookingChange({ db, principal, operation, booking, recipientUserId = principal.id }) {
  try {
    const user = await db.collection("user").findOne(userIdFilter(recipientUserId), { projection: { email: 1 } });
    if (!user?.email) throw new Error("recipient unavailable");
    const send = operation === "cancel" ? sendBookingCancellation : sendBookingReschedule;
    await send({ to: user.email, name: booking.customerName, booking });
  } catch {
    try {
      await appendAuditEvent(db, { actorId: principal.id, action: `booking.${operation}.delivery_failed`, targetType: "Booking", targetId: booking.id, outcome: "failure" });
    } catch {
      // No further reporting channel: the booking change already succeeded.
    }
  }
}
