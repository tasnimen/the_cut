import { ACTIVE_BOOKING_STATUSES, BOOKING_COLLECTION } from "@/lib/booking/booking-model";
import { isValidLocalDate } from "@/lib/booking/time";
import { appendAuditEvent } from "@/lib/security/audit-log";

// "Accepting bookings" for a barber and "bookable" for a service (Stage D). Both only stop NEW bookings.
// They are separate from active (hidden) and from archive, and they never change an existing booking:
// the upcoming bookings are only listed so a person can see them.

const NOT_ARCHIVED = { archivedAt: { $exists: false } };
const cleanNote = (value) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200);

export async function listUpcomingBarberBookings(db, barberId, now = new Date(), limit = 50) {
  const rows = await db.collection(BOOKING_COLLECTION).find({ barberId: String(barberId), status: { $in: [...ACTIVE_BOOKING_STATUSES] }, endsAt: { $gt: now } }).sort({ startsAt: 1 }).limit(limit).toArray();
  return rows.map((row) => ({ id: String(row._id), customerName: row.customerName, startsAt: row.startsAt.toISOString(), status: row.status, services: (row.services ?? []).map((service) => service.name) }));
}

// accepting false pauses new bookings (optionally until a date, inclusive); true resumes and clears the pause.
export async function setBarberAccepting(db, { slug, accepting, until = "", note = "", actorId, now = new Date() }) {
  if (typeof accepting !== "boolean") return { ok: false, error: "invalid" };
  const pausedUntil = accepting ? "" : String(until || "");
  if (pausedUntil && !isValidLocalDate(pausedUntil)) return { ok: false, error: "invalid_date" };
  const set = accepting
    ? { acceptingBookings: true, pausedUntil: null, pauseNote: "", updatedAt: now }
    : { acceptingBookings: false, pausedUntil: pausedUntil || null, pauseNote: cleanNote(note), updatedAt: now };
  const barber = await db.collection("barber").findOne({ slug, ...NOT_ARCHIVED });
  if (!barber) return { ok: false, error: "not_found" };
  await db.collection("barber").updateOne({ _id: barber._id, ...NOT_ARCHIVED }, { $set: set });
  await appendAuditEvent(db, { actorId, action: accepting ? "availability.barber_resumed" : "availability.barber_paused", targetType: "Barber", targetId: slug, outcome: "success", details: pausedUntil ? { until: pausedUntil } : {} });
  const upcomingBookings = accepting ? [] : await listUpcomingBarberBookings(db, barber._id, now);
  return { ok: true, upcomingBookings };
}

export async function setServiceBookable(db, { slug, bookable, actorId, now = new Date() }) {
  if (typeof bookable !== "boolean") return { ok: false, error: "invalid" };
  const result = await db.collection("service").updateOne({ slug, ...NOT_ARCHIVED }, { $set: { bookable, updatedAt: now } });
  if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
  await appendAuditEvent(db, { actorId, action: bookable ? "availability.service_bookable" : "availability.service_not_bookable", targetType: "Service", targetId: slug, outcome: "success" });
  return { ok: true };
}
