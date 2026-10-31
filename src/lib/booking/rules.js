import { BOOKING_CONFIG } from "@/config/booking";
import { addLocalCalendarDays, businessDate, formatBookingTime, getBusinessHours, getLocalDateTime, possibleInstantsForLocalTime, toLocalWallTime } from "@/lib/booking/time";

export function roundServiceDuration(minutes, slotMinutes = BOOKING_CONFIG.slotMinutes) {
  if (!Number.isInteger(minutes) || minutes <= 0) throw new RangeError("Invalid service duration");
  return Math.ceil(minutes / slotMinutes) * slotMinutes;
}

export function calculateBookingDuration(services) {
  return services.reduce((total, service) => total + roundServiceDuration(service.durationMinutes), 0);
}

export function reservationSlotStarts(startsAt, durationMinutes, config = BOOKING_CONFIG) {
  const totalMinutes = durationMinutes + config.cleanupBufferMinutes;
  const slotCount = Math.ceil(totalMinutes / config.slotMinutes);
  return Array.from({ length: slotCount }, (_, index) => new Date(startsAt.getTime() + index * config.slotMinutes * 60_000));
}

// Why a barber cannot take a booking at a time: "unavailable" (day off, no hours that day, outside the barber's hours, or
// not long enough before closing) or "break". Returns null when the schedule allows it.
function scheduleConflictReason(barber, startsAt, durationMinutes, config) {
  const localDate = businessDate(startsAt, config.timeZone);
  if ((barber.daysOff || []).includes(localDate)) return "unavailable";
  const localTime = toLocalWallTime(startsAt, config.timeZone).slice(11, 16);
  const [startHour, startMinutePart] = localTime.split(":").map(Number);
  const startMinute = startHour * 60 + startMinutePart;
  const endMinute = startMinute + durationMinutes + config.cleanupBufferMinutes;
  const day = new Intl.DateTimeFormat("en-US", { timeZone: config.timeZone, weekday: "long" }).format(startsAt).toLowerCase();
  const schedule = barber.weeklySchedule?.[day];
  if (!schedule) return "unavailable";
  const [openHour, openMinute] = schedule.open.split(":").map(Number);
  const [closeHour, closeMinute] = schedule.close.split(":").map(Number);
  if (startMinute < openHour * 60 + openMinute || endMinute > closeHour * 60 + closeMinute) return "unavailable";
  const breakRange = barber.breaks?.[day];
  if (breakRange) {
    const [breakStartHour, breakStartMinute] = breakRange.open.split(":").map(Number);
    const [breakEndHour, breakEndMinute] = breakRange.close.split(":").map(Number);
    const breakStart = breakStartHour * 60 + breakStartMinute;
    const breakEnd = breakEndHour * 60 + breakEndMinute;
    if (startMinute < breakEnd && endMinute > breakStart) return "break";
  }
  return null;
}

// A block (barberId null = every barber) stops bookings whose time (including the cleanup buffer) overlaps it.
const blockedByTimeBlock = (blocks, barberId, startsAt, endsAt) => blocks.some((block) => (block.barberId == null || String(block.barberId) === String(barberId)) && new Date(block.startsAt) < endsAt && new Date(block.endsAt) > startsAt);

// Every start time of the shop's day for one barber, each with whether it can be booked and, if not, why:
// past, booked, blocked, break or unavailable. This is the only place that decides it: the public booking page, the
// booking itself (re-checked inside the transaction), rescheduling, walk-ins and the schedule view all use it.
// `paused` (the barber is not taking bookings that day) makes every future time unavailable.
export function evaluateSlots({ localDate, services, barber, busySlotKeys = new Set(), blocks = [], paused = false, now = new Date(), config = BOOKING_CONFIG }) {
  const hours = getBusinessHours(localDate, config);
  if (!hours) return [];
  const durationMinutes = calculateBookingDuration(services);
  const [openHour, openMinute] = hours.open.split(":").map(Number);
  const [closeHour, closeMinute] = hours.close.split(":").map(Number);
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const maxLocalDate = addLocalCalendarDays(businessDate(now, config.timeZone), config.maximumAdvanceDays);
  if (localDate > maxLocalDate) return [];
  const earliest = new Date(now.getTime() + config.minimumLeadMinutes * 60 * 1000);
  const closingInstant = possibleInstantsForLocalTime(getLocalDateTime(localDate, closeMinutes), config.timeZone).at(-1);
  const results = [];

  for (let minute = openMinutes; minute < closeMinutes; minute += config.slotMinutes) {
    const instants = possibleInstantsForLocalTime(getLocalDateTime(localDate, minute), config.timeZone);
    for (const startsAt of instants) {
      const finishesAndCleansAt = new Date(startsAt.getTime() + (durationMinutes + config.cleanupBufferMinutes) * 60_000);
      let reason = null;
      if (startsAt < earliest) reason = "past";
      else if (paused || finishesAndCleansAt > closingInstant) reason = "unavailable";
      else {
        reason = scheduleConflictReason(barber, startsAt, durationMinutes, config);
        if (!reason && reservationSlotStarts(startsAt, durationMinutes, config).some((slot) => busySlotKeys.has(`${barber.id}:${slot.toISOString()}`))) reason = "booked";
        if (!reason && blockedByTimeBlock(blocks, barber.id, startsAt, finishesAndCleansAt)) reason = "blocked";
      }
      results.push(Object.freeze({ startsAt: startsAt.toISOString(), label: formatBookingTime(startsAt, config.timeZone), durationMinutes, barberId: barber.id, available: reason === null, reason }));
    }
  }
  return results.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// The times that can be booked (see evaluateSlots).
export function generateCandidateSlots(input) {
  return evaluateSlots(input).filter((slot) => slot.available).map(({ startsAt, label, durationMinutes, barberId }) => Object.freeze({ startsAt, label, durationMinutes, barberId }));
}

export function isOnBookingGrid(startsAt, timeZone = BOOKING_CONFIG.timeZone) {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return false;
  const minute = Number(toLocalWallTime(date, timeZone).slice(14, 16));
  return [0, 15, 30, 45].includes(minute) && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
}

export function scheduleDayFromInstant(instant, timeZone = BOOKING_CONFIG.timeZone) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(instant).toLowerCase();
}
