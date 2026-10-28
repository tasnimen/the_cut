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

function hasScheduleConflict(barber, startsAt, durationMinutes, config) {
  const localDate = businessDate(startsAt, config.timeZone);
  if ((barber.daysOff || []).includes(localDate)) return true;
  const localTime = toLocalWallTime(startsAt, config.timeZone).slice(11, 16);
  const [startHour, startMinutePart] = localTime.split(":").map(Number);
  const startMinute = startHour * 60 + startMinutePart;
  const endMinute = startMinute + durationMinutes + config.cleanupBufferMinutes;
  const day = new Intl.DateTimeFormat("en-US", { timeZone: config.timeZone, weekday: "long" }).format(startsAt).toLowerCase();
  const schedule = barber.weeklySchedule?.[day];
  if (!schedule) return true;
  const [openHour, openMinute] = schedule.open.split(":").map(Number);
  const [closeHour, closeMinute] = schedule.close.split(":").map(Number);
  if (startMinute < openHour * 60 + openMinute || endMinute > closeHour * 60 + closeMinute) return true;
  const breakRange = barber.breaks?.[day];
  if (breakRange) {
    const [breakStartHour, breakStartMinute] = breakRange.open.split(":").map(Number);
    const [breakEndHour, breakEndMinute] = breakRange.close.split(":").map(Number);
    const breakStart = breakStartHour * 60 + breakStartMinute;
    const breakEnd = breakEndHour * 60 + breakEndMinute;
    if (startMinute < breakEnd && endMinute > breakStart) return true;
  }
  return false;
}

export function generateCandidateSlots({ localDate, services, barber, busySlotKeys = new Set(), now = new Date(), config = BOOKING_CONFIG }) {
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
  const results = [];

  for (let minute = openMinutes; minute < closeMinutes; minute += config.slotMinutes) {
    const localWallTime = getLocalDateTime(localDate, minute);
    const instants = possibleInstantsForLocalTime(localWallTime, config.timeZone);
    const closingInstants = possibleInstantsForLocalTime(getLocalDateTime(localDate, closeMinutes), config.timeZone);
    const closingInstant = closingInstants.at(-1);
    for (const startsAt of instants) {
      const finishesAndCleansAt = new Date(startsAt.getTime() + (durationMinutes + config.cleanupBufferMinutes) * 60_000);
      if (startsAt < earliest || finishesAndCleansAt > closingInstant) continue;
      if (hasScheduleConflict(barber, startsAt, durationMinutes, config)) continue;
      const reservationSlots = reservationSlotStarts(startsAt, durationMinutes, config);
      if (reservationSlots.some((slot) => busySlotKeys.has(`${barber.id}:${slot.toISOString()}`))) continue;
      results.push(Object.freeze({
        startsAt: startsAt.toISOString(),
        label: formatBookingTime(startsAt, config.timeZone),
        durationMinutes,
        barberId: barber.id,
      }));
    }
  }
  return results.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
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
