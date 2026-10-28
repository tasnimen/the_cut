import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { BOOKING_CONFIG } from "@/config/booking";

const WEEKDAY_KEYS = Object.freeze(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]);
const WALL_FORMAT = "yyyy-MM-dd'T'HH:mm";

export function isValidLocalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseISO(value);
  return Number.isFinite(parsed.getTime()) && format(parsed, "yyyy-MM-dd") === value;
}

export function addLocalCalendarDays(date, amount) {
  return format(addDays(parseISO(`${date}T12:00:00Z`), amount), "yyyy-MM-dd");
}

export function businessDate(date = new Date(), timeZone = BOOKING_CONFIG.timeZone) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function getLocalDateTime(date, minutes) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${date}T${hour}:${minute}`;
}

export function possibleInstantsForLocalTime(localDateTime, timeZone = BOOKING_CONFIG.timeZone) {
  const base = fromZonedTime(`${localDateTime}:00`, timeZone);
  if (!Number.isFinite(base.getTime())) return [];
  const matches = new Map();
  for (let offsetMinutes = -120; offsetMinutes <= 120; offsetMinutes += 30) {
    const candidate = new Date(base.getTime() + offsetMinutes * 60_000);
    if (formatInTimeZone(candidate, timeZone, WALL_FORMAT) === localDateTime) {
      matches.set(candidate.getTime(), candidate);
    }
  }
  return [...matches.values()].sort((left, right) => left.getTime() - right.getTime());
}

function nthWeekdayOfMonth(year, monthIndex, weekday, ordinal) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, monthIndex, 1 + offset + (ordinal - 1) * 7));
}

function lastWeekdayOfMonth(year, monthIndex, weekday) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const offset = (lastDay.getUTCDay() - weekday + 7) % 7;
  lastDay.setUTCDate(lastDay.getUTCDate() - offset);
  return lastDay;
}

export function getHolidayName(localDate, config = BOOKING_CONFIG) {
  if (!isValidLocalDate(localDate)) return null;
  if (config.holidays.additionalClosedDates.includes(localDate)) return "Additional closure";
  const year = Number(localDate.slice(0, 4));
  const md = localDate.slice(5);
  if (config.holidays.newYearsDay && md === "01-01") return "New Year's Day";
  if (config.holidays.independenceDay && md === "07-04") return "Independence Day";
  if (config.holidays.christmasDay && md === "12-25") return "Christmas Day";
  if (config.holidays.thanksgiving && localDate === format(nthWeekdayOfMonth(year, 10, 4, 4), "yyyy-MM-dd")) return "Thanksgiving";
  if (config.holidays.memorialDay && localDate === format(lastWeekdayOfMonth(year, 4, 1), "yyyy-MM-dd")) return "Memorial Day";
  if (config.holidays.laborDay && localDate === format(nthWeekdayOfMonth(year, 8, 1, 1), "yyyy-MM-dd")) return "Labor Day";
  return null;
}

export function getBusinessHours(localDate, config = BOOKING_CONFIG) {
  if (!isValidLocalDate(localDate) || getHolidayName(localDate, config)) return null;
  const weekday = WEEKDAY_KEYS[parseISO(`${localDate}T12:00:00Z`).getUTCDay()];
  const hours = config.openingHours[weekday];
  if (!hours) return null;
  if (config.holidays.december24EarlyClose && localDate.endsWith("12-24")) {
    return { open: hours.open, close: config.holidays.december24EarlyCloseAt };
  }
  return hours;
}

export function getLocalDayRange(localDate, timeZone = BOOKING_CONFIG.timeZone) {
  const start = fromZonedTime(`${localDate}T00:00:00`, timeZone);
  const nextDate = addLocalCalendarDays(localDate, 1);
  const end = fromZonedTime(`${nextDate}T00:00:00`, timeZone);
  return { start, end };
}

export function formatBookingTime(instant, timeZone = BOOKING_CONFIG.timeZone) {
  return `${formatInTimeZone(instant, timeZone, "h:mm a zzz")}`;
}

export function formatBookingDateTime(instant, timeZone = BOOKING_CONFIG.timeZone) {
  const local = formatInTimeZone(instant, timeZone, "EEEE, MMMM d, yyyy 'at' h:mm a");
  return `${local} ET`;
}

export function toLocalWallTime(instant, timeZone = BOOKING_CONFIG.timeZone) {
  return formatInTimeZone(instant, timeZone, WALL_FORMAT);
}

