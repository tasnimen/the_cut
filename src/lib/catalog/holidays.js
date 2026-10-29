// Pure rules for the closed-date settings that the booking engine and the contact page share.
// The file values (config/booking.js `holidays`) are the defaults; a database document may override
// them field by field. Invalid fields are ignored (the file value stays), so a bad document can never
// break booking.

export const HOLIDAY_FLAG_KEYS = Object.freeze(["newYearsDay", "memorialDay", "independenceDay", "laborDay", "thanksgiving", "christmasDay", "december24EarlyClose"]);
export const MAX_CLOSED_DATES = 120;

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isValidDateString(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeHolidays(document, fileHolidays) {
  const result = { ...fileHolidays };
  if (document && typeof document === "object") {
    for (const key of HOLIDAY_FLAG_KEYS) {
      if (typeof document[key] === "boolean") result[key] = document[key];
    }
    if (isValidTime(document.december24EarlyCloseAt)) result.december24EarlyCloseAt = document.december24EarlyCloseAt;
    if (Array.isArray(document.additionalClosedDates)) {
      const dates = [...new Set(document.additionalClosedDates.filter(isValidDateString))].sort().slice(0, MAX_CLOSED_DATES);
      result.additionalClosedDates = Object.freeze(dates);
    }
  }
  result.additionalClosedDates = Object.freeze([...(result.additionalClosedDates ?? [])]);
  return Object.freeze(result);
}

export function mergeBookingConfig(baseConfig, holidays) {
  return Object.freeze({ ...baseConfig, holidays });
}
