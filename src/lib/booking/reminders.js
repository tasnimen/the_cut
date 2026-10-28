import "server-only";
import { BOOKING_CONFIG } from "@/config/booking";
import { formatBookingDateTime } from "@/lib/booking/time";
import { appendAuditEvent } from "@/lib/security/audit-log";

const REMINDER_BATCH_SIZE = 100;
const CLAIM_LEASE_MS = 10 * 60 * 1000;

export async function runDueBookingReminders({ db, sendReminder, now = new Date() }) {
  const due = await db.collection("booking").find({
    status: "confirmed",
    reminderDueAt: { $lte: now },
    reminderSentAt: null,
    startsAt: { $gt: now },
    $or: [{ reminderClaimedAt: null }, { reminderClaimedAt: { $lt: new Date(now.getTime() - CLAIM_LEASE_MS) } }],
  }, { projection: { userId: 1, customerName: 1, services: 1, barberId: 1, barberName: 1, startsAt: 1, endsAt: 1, durationMinutes: 1, bufferMinutes: 1, totalPriceMinorUnits: 1, currency: 1 } })
    .sort({ reminderDueAt: 1 })
    .limit(REMINDER_BATCH_SIZE)
    .toArray();
  let sent = 0;
  let failed = 0;

  for (const booking of due) {
    const claimed = await db.collection("booking").findOneAndUpdate({
      _id: booking._id,
      status: "confirmed",
      reminderDueAt: { $lte: now },
      reminderSentAt: null,
      startsAt: { $gt: now },
      $or: [{ reminderClaimedAt: null }, { reminderClaimedAt: { $lt: new Date(now.getTime() - CLAIM_LEASE_MS) } }],
    }, { $set: { reminderClaimedAt: now } }, { returnDocument: "after" });
    if (!claimed) continue;

    const user = await db.collection("user").findOne({ id: booking.userId }, { projection: { email: 1 } });
    try {
      if (!user?.email) throw new Error("booking_reminder_recipient_missing");
      await sendReminder({
        to: user.email,
        name: booking.customerName,
        booking: {
          ...booking,
          id: String(booking._id),
          barber: { id: booking.barberId, name: booking.barberName },
          localStart: formatBookingDateTime(booking.startsAt, BOOKING_CONFIG.timeZone),
        },
      });
      await db.collection("booking").updateOne({ _id: booking._id, reminderClaimedAt: now }, {
        $set: { reminderSentAt: now, updatedAt: now },
        $unset: { reminderClaimedAt: "" },
      });
      sent += 1;
    } catch {
      await db.collection("booking").updateOne({ _id: booking._id, reminderClaimedAt: now }, { $unset: { reminderClaimedAt: "" } });
      try {
        await appendAuditEvent(db, {
          actorId: null,
          action: "booking.reminder.delivery_failed",
          targetType: "Booking",
          targetId: String(booking._id),
          outcome: "failure",
        });
      } catch {
        // Reminder errors and provider details are deliberately not logged.
      }
      failed += 1;
    }
  }
  return Object.freeze({ sent, failed });
}
