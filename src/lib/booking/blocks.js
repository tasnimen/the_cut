import { ObjectId } from "mongodb";
import { BOOKING_CONFIG } from "@/config/booking";
import { ACTIVE_BOOKING_STATUSES, BOOKING_COLLECTION } from "@/lib/booking/booking-model";
import { addLocalCalendarDays, getLocalDayRange, isValidLocalDate, possibleInstantsForLocalTime } from "@/lib/booking/time";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Time blocks (Stage D). A block stops NEW bookings for one barber, or for the whole shop (barberId null), between two
// instants. A block never cancels, moves or changes an existing booking: if it overlaps one, creating it is refused and
// the conflicting bookings are listed so a person can handle them with the normal booking actions.
// The reason is for the dashboard only; customers just see "Unavailable".

export const TIME_BLOCK_COLLECTION = "timeBlock";
export const MAX_REASON_LENGTH = 200;
export const MAX_BLOCK_DAYS = 62;

const cleanReason = (value) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_REASON_LENGTH);
const toMinutes = (time) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time)) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null);

// Turns the form fields into one UTC interval, or an error code.
// Input: { startDate, endDate (optional, inclusive; defaults to startDate), allDay, startTime, endTime } in shop time.
export function resolveBlockInterval({ startDate, endDate, allDay = false, startTime, endTime }, timeZone = BOOKING_CONFIG.timeZone) {
  const lastDate = endDate || startDate;
  if (!isValidLocalDate(startDate) || !isValidLocalDate(lastDate) || lastDate < startDate) return { error: "invalid_dates" };
  if (addLocalCalendarDays(startDate, MAX_BLOCK_DAYS) < lastDate) return { error: "range_too_long" };
  if (allDay) {
    return { startsAt: getLocalDayRange(startDate, timeZone).start, endsAt: getLocalDayRange(lastDate, timeZone).end };
  }
  const from = toMinutes(startTime);
  const to = toMinutes(endTime);
  if (from === null || to === null || to <= from) return { error: "invalid_times" };
  if (lastDate !== startDate) return { error: "invalid_dates" };
  const hhmm = (minutes) => `${startDate}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const [start] = possibleInstantsForLocalTime(hhmm(from), timeZone);
  const [end] = possibleInstantsForLocalTime(hhmm(to), timeZone);
  if (!start || !end || end <= start) return { error: "invalid_times" };
  return { startsAt: start, endsAt: end };
}

export const publicBlock = (block) => ({
  id: String(block._id),
  barberId: block.barberId ?? null,
  startsAt: block.startsAt.toISOString(),
  endsAt: block.endsAt.toISOString(),
  reason: block.reason ?? "",
  status: block.status,
  createdAt: block.createdAt?.toISOString?.() ?? null,
});

// Active or pending bookings that a block over [startsAt, endsAt) would overlap (for one barber, or all). Read-only.
export async function findBookingConflicts(db, { barberId = null, startsAt, endsAt, excludeBlockId = null }) {
  const filter = { status: { $in: [...ACTIVE_BOOKING_STATUSES] }, startsAt: { $lt: endsAt }, endsAt: { $gt: startsAt } };
  if (barberId) filter.barberId = String(barberId);
  const rows = await db.collection(BOOKING_COLLECTION).find(filter).sort({ startsAt: 1 }).limit(100).toArray();
  void excludeBlockId;
  return rows.map((row) => ({ id: String(row._id), customerName: row.customerName, barberId: row.barberId, barberName: row.barberName, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), status: row.status, services: (row.services ?? []).map((service) => service.name) }));
}

// Creates a block, or refuses with the list of bookings it would overlap. Nothing existing is ever changed.
export async function createTimeBlock(db, { barberId = null, startsAt, endsAt, reason = "", actorId, now = new Date() }) {
  if (!(startsAt instanceof Date) || !(endsAt instanceof Date) || !(endsAt > startsAt)) return { ok: false, error: "invalid_times" };
  let barberKey = null;
  if (barberId) {
    if (!ObjectId.isValid(barberId)) return { ok: false, error: "barber_not_found" };
    const barber = await db.collection("barber").findOne({ _id: new ObjectId(String(barberId)) });
    if (!barber || barber.archivedAt) return { ok: false, error: "barber_not_found" };
    barberKey = String(barber._id);
  }
  const conflicts = await findBookingConflicts(db, { barberId: barberKey, startsAt, endsAt });
  if (conflicts.length) return { ok: false, error: "conflicts", conflicts };
  const doc = { barberId: barberKey, startsAt, endsAt, reason: cleanReason(reason), status: "active", createdBy: actorId, createdAt: now, removedAt: null, removedBy: null };
  const { insertedId } = await db.collection(TIME_BLOCK_COLLECTION).insertOne(doc);
  await appendAuditEvent(db, { actorId, action: "availability.block_created", targetType: "TimeBlock", targetId: String(insertedId), outcome: "success", details: { scope: barberKey ? "barber" : "shop" } });
  return { ok: true, block: publicBlock({ ...doc, _id: insertedId }) };
}

// Unblocking keeps the record (status "removed") so the history stays; the time is bookable again at once.
export async function removeTimeBlock(db, { blockId, actorId, now = new Date() }) {
  if (!ObjectId.isValid(blockId)) return { ok: false, error: "not_found" };
  const result = await db.collection(TIME_BLOCK_COLLECTION).updateOne({ _id: new ObjectId(String(blockId)), status: "active" }, { $set: { status: "removed", removedAt: now, removedBy: actorId } });
  if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
  await appendAuditEvent(db, { actorId, action: "availability.block_removed", targetType: "TimeBlock", targetId: String(blockId), outcome: "success" });
  return { ok: true };
}

// Changing a block's times or reason. A longer or moved block is checked for booking conflicts the same way as a new one.
export async function updateTimeBlock(db, { blockId, startsAt, endsAt, reason, actorId, now = new Date() }) {
  if (!ObjectId.isValid(blockId)) return { ok: false, error: "not_found" };
  const block = await db.collection(TIME_BLOCK_COLLECTION).findOne({ _id: new ObjectId(String(blockId)), status: "active" });
  if (!block) return { ok: false, error: "not_found" };
  const nextStart = startsAt ?? block.startsAt;
  const nextEnd = endsAt ?? block.endsAt;
  if (!(nextEnd > nextStart)) return { ok: false, error: "invalid_times" };
  const conflicts = await findBookingConflicts(db, { barberId: block.barberId, startsAt: nextStart, endsAt: nextEnd });
  if (conflicts.length) return { ok: false, error: "conflicts", conflicts };
  await db.collection(TIME_BLOCK_COLLECTION).updateOne({ _id: block._id, status: "active" }, { $set: { startsAt: nextStart, endsAt: nextEnd, reason: reason === undefined ? block.reason : cleanReason(reason), updatedAt: now } });
  await appendAuditEvent(db, { actorId, action: "availability.block_updated", targetType: "TimeBlock", targetId: String(blockId), outcome: "success" });
  return { ok: true };
}

// Active blocks that touch [from, to) (newest first is not needed: calendar order).
export async function listTimeBlocks(db, { from = new Date(), to = null, limit = 200 } = {}) {
  const filter = { status: "active", endsAt: { $gt: from } };
  if (to) filter.startsAt = { $lt: to };
  const rows = await db.collection(TIME_BLOCK_COLLECTION).find(filter).sort({ startsAt: 1 }).limit(limit).toArray();
  return rows.map(publicBlock);
}
