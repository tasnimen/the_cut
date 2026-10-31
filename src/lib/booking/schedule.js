import { BOOKING_CONFIG } from "@/config/booking";
import { isBarberPaused } from "@/lib/booking/availability";
import { BOOKING_COLLECTION } from "@/lib/booking/booking-model";
import { addLocalCalendarDays, getBusinessHours, getLocalDateTime, getLocalDayRange, isValidLocalDate, possibleInstantsForLocalTime } from "@/lib/booking/time";

// Read-only data for the schedule screen (Stage D): for each barber and day, what is booked, blocked, on break, free,
// or closed, in time order. It is a view of the same data the booking rules use; it never changes anything.

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const minutesOf = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const instantAt = (localDate, minutes, timeZone) => possibleInstantsForLocalTime(getLocalDateTime(localDate, minutes), timeZone)[0] ?? null;
const weekdayOf = (localDate) => WEEKDAYS[new Date(`${localDate}T12:00:00Z`).getUTCDay()];

function workingWindow(barber, localDate, config) {
  if ((barber.daysOff || []).includes(localDate)) return null;
  const shop = getBusinessHours(localDate, config);
  const own = barber.weeklySchedule?.[weekdayOf(localDate)];
  if (!shop || !own) return null;
  const open = Math.max(minutesOf(shop.open), minutesOf(own.open));
  const close = Math.min(minutesOf(shop.close), minutesOf(own.close));
  return close > open ? { open, close } : null;
}

// Free time = the working window minus bookings (with their buffer), blocks and the break.
function freeRanges(window, busy) {
  const sorted = busy.filter((range) => range.end > window.start && range.start < window.end).sort((a, b) => a.start - b.start);
  const free = [];
  let cursor = window.start;
  for (const range of sorted) {
    if (range.start > cursor) free.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

export async function loadSchedule(db, { localDate, days = 1, barberSlug = "", now = new Date(), config = BOOKING_CONFIG }) {
  if (!isValidLocalDate(localDate)) return [];
  const dates = Array.from({ length: Math.min(Math.max(days, 1), 7) }, (_, index) => addLocalCalendarDays(localDate, index));
  const rangeStart = getLocalDayRange(dates[0], config.timeZone).start;
  const rangeEnd = getLocalDayRange(dates.at(-1), config.timeZone).end;
  const barberFilter = { active: true, archivedAt: { $exists: false } };
  const barbers = (await db.collection("barber").find(barberFilter).sort({ name: 1 }).toArray()).filter((barber) => !barberSlug || barber.slug === barberSlug);
  const ids = barbers.map((barber) => String(barber._id));
  const bookings = ids.length ? await db.collection(BOOKING_COLLECTION).find({ barberId: { $in: ids }, status: { $in: ["pending", "confirmed", "completed", "no_show"] }, startsAt: { $lt: rangeEnd }, endsAt: { $gt: rangeStart } }).sort({ startsAt: 1 }).toArray() : [];
  const blocks = await db.collection("timeBlock").find({ status: "active", startsAt: { $lt: rangeEnd }, endsAt: { $gt: rangeStart } }).sort({ startsAt: 1 }).toArray();

  return dates.map((date) => {
    const { start: dayStart, end: dayEnd } = getLocalDayRange(date, config.timeZone);
    const minuteOf = (instant) => Math.round((instant.getTime() - dayStart.getTime()) / 60_000);
    return {
      date,
      barbers: barbers.map((barber) => {
        const id = String(barber._id);
        const window = workingWindow(barber, date, config);
        const items = [];
        const busy = [];
        for (const booking of bookings.filter((row) => row.barberId === id && row.startsAt < dayEnd && row.endsAt > dayStart)) {
          items.push({ type: "booking", id: String(booking._id), status: booking.status, customerName: booking.customerName, services: (booking.services ?? []).map((service) => service.name), startsAt: booking.startsAt.toISOString(), endsAt: booking.endsAt.toISOString() });
          busy.push({ start: minuteOf(booking.startsAt), end: minuteOf(booking.endsAt) + (config.cleanupBufferMinutes ?? 0) });
        }
        for (const block of blocks.filter((row) => (row.barberId == null || String(row.barberId) === id) && row.startsAt < dayEnd && row.endsAt > dayStart)) {
          items.push({ type: "block", id: String(block._id), scope: block.barberId ? "barber" : "shop", reason: block.reason ?? "", startsAt: new Date(Math.max(block.startsAt, dayStart)).toISOString(), endsAt: new Date(Math.min(block.endsAt, dayEnd)).toISOString() });
          busy.push({ start: minuteOf(new Date(Math.max(block.startsAt, dayStart))), end: minuteOf(new Date(Math.min(block.endsAt, dayEnd))) });
        }
        const paused = isBarberPaused(barber, date);
        if (window) {
          const breakRange = barber.breaks?.[weekdayOf(date)];
          if (breakRange) {
            const from = instantAt(date, minutesOf(breakRange.open), config.timeZone);
            const to = instantAt(date, minutesOf(breakRange.close), config.timeZone);
            if (from && to) {
              items.push({ type: "break", startsAt: from.toISOString(), endsAt: to.toISOString() });
              busy.push({ start: minuteOf(from), end: minuteOf(to) });
            }
          }
          if (!paused) {
            for (const range of freeRanges({ start: minuteOf(instantAt(date, window.open, config.timeZone)), end: minuteOf(instantAt(date, window.close, config.timeZone)) }, busy)) {
              const from = new Date(dayStart.getTime() + range.start * 60_000);
              const to = new Date(dayStart.getTime() + range.end * 60_000);
              if (to > now) items.push({ type: "free", startsAt: (from < now ? now : from).toISOString(), endsAt: to.toISOString() });
            }
          }
        }
        items.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.type.localeCompare(b.type));
        return { id, slug: barber.slug, name: barber.name, state: !window ? "off" : paused ? "paused" : "working", pauseNote: paused ? barber.pauseNote ?? "" : "", pausedUntil: paused ? barber.pausedUntil ?? null : null, items };
      }),
    };
  });
}
