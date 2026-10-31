import { formatInTimeZone } from "date-fns-tz";

// Calendar files (.ics) for booking emails. Times are written as local wall time in the shop's time zone with a
// matching VTIMEZONE block, so every calendar app shows the right hour across the daylight saving change.
// One booking always has the same UID; the SEQUENCE grows with each change so a reschedule updates the existing
// event instead of adding a second one, and METHOD:CANCEL with STATUS:CANCELLED removes it.

const TIME_ZONE = "America/New_York";
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

const local = (date) => formatInTimeZone(date, TIME_ZONE, "yyyyMMdd'T'HHmmss");
const utc = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escapeText = (value) => String(value ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Lines longer than 75 bytes are folded with CRLF and a leading space (RFC 5545).
function fold(line) {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut -= 1;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

// Increases with every change of the booking (minutes since 2026-01-01), which is all a calendar needs.
export const sequenceFor = (updatedAt) => Math.max(0, Math.floor((new Date(updatedAt).getTime() - Date.UTC(2026, 0, 1)) / 60_000));

export function buildIcs({ uid, method = "REQUEST", sequence = 0, start, end, summary, description = "", location = "", now = new Date() }) {
  if (!["REQUEST", "CANCEL"].includes(method)) throw new Error("Unsupported calendar method");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Cut Barbershop//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    `X-WR-TIMEZONE:${TIME_ZONE}`,
    ...VTIMEZONE,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utc(now)}`,
    `SEQUENCE:${sequence}`,
    `DTSTART;TZID=${TIME_ZONE}:${local(start)}`,
    `DTEND;TZID=${TIME_ZONE}:${local(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
