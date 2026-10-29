const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

export function telHref(phone) {
  if (typeof phone !== "string") return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? `tel:${digits}` : null;
}

export function mailtoHref(email) {
  return typeof email === "string" && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? `mailto:${email}` : null;
}

export function formatAddress(location) {
  const parts = [location?.streetAddress, location?.city, [location?.region, location?.postalCode].filter(Boolean).join(" ")].filter(Boolean);
  return location?.streetAddress ? parts.join(", ") : null;
}

// Google Maps search URL; no API key. Only built when a street address is configured.
export function mapsHref(location) {
  const address = formatAddress(location);
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
}

function to12h(value) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

// Groups consecutive days with identical hours, e.g. "Mon–Fri 9:00 AM – 7:00 PM".
export function formatOpeningHours(openingHours) {
  const groups = [];
  for (const day of DAY_ORDER) {
    const hours = openingHours?.[day];
    if (!hours) continue;
    const label = `${to12h(hours.open)} – ${to12h(hours.close)}`;
    const last = groups[groups.length - 1];
    if (last && last.label === label && last.endIndex === DAY_ORDER.indexOf(day) - 1) {
      last.end = day;
      last.endIndex += 1;
    } else {
      groups.push({ start: day, end: day, label, endIndex: DAY_ORDER.indexOf(day) });
    }
  }
  return groups.map((group) => ({
    days: group.start === group.end ? DAY_LABELS[group.start] : `${DAY_LABELS[group.start]}–${DAY_LABELS[group.end]}`,
    hours: group.label,
  }));
}

export function socialLinks(social) {
  return Object.entries(social ?? {})
    .filter(([, url]) => typeof url === "string" && /^https:\/\//.test(url))
    .map(([name, url]) => ({ name, url }));
}

const TIME_ZONE_LABELS = { "America/New_York": "ET" };
export const timeZoneLabel = (timeZone) => TIME_ZONE_LABELS[timeZone] ?? timeZone;

const HOLIDAY_LABELS = [
  ["newYearsDay", "New Year's Day"],
  ["memorialDay", "Memorial Day"],
  ["independenceDay", "Independence Day"],
  ["laborDay", "Labor Day"],
  ["thanksgiving", "Thanksgiving"],
  ["christmasDay", "Christmas Day"],
];

// Closures and early closes straight from config/booking.js `holidays` (no second list to maintain).
export function formatClosures(holidays = {}) {
  const closed = HOLIDAY_LABELS.filter(([key]) => holidays[key]).map(([, label]) => label);
  const extraDates = Array.isArray(holidays.additionalClosedDates) ? holidays.additionalClosedDates : [];
  const earlyClose = holidays.december24EarlyClose && /^\d{2}:\d{2}$/.test(holidays.december24EarlyCloseAt ?? "")
    ? `Dec 24: closes ${to12h(holidays.december24EarlyCloseAt)}`
    : null;
  return { closed, extraDates, earlyClose };
}
