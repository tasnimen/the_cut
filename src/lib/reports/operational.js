import { addLocalCalendarDays, businessDate, getLocalDayRange } from "@/lib/booking/time";

// Operational reports (I-22): counts and rates only. Money (revenue, takings) is deliberately absent:
// financial reports are Super Admin only (permission financialReportsAll, unit I-26).

export const REPORT_RANGES = Object.freeze({
  last7: { label: "Last 7 days", days: 7, direction: "past" },
  last30: { label: "Last 30 days", days: 30, direction: "past" },
  last90: { label: "Last 90 days", days: 90, direction: "past" },
  next7: { label: "Next 7 days", days: 7, direction: "future" },
});
export const DEFAULT_REPORT_RANGE = "last30";

export function parseReportRange(params = {}) {
  const raw = Array.isArray(params.range) ? params.range[0] : params.range;
  return typeof raw === "string" && Object.hasOwn(REPORT_RANGES, raw) ? raw : DEFAULT_REPORT_RANGE;
}

// Business-day bounds (start inclusive, end exclusive) for a range key, in the shop's time zone.
export function reportBounds(rangeKey, now, timeZone) {
  const range = REPORT_RANGES[rangeKey] ?? REPORT_RANGES[DEFAULT_REPORT_RANGE];
  const today = businessDate(now, timeZone);
  const firstDate = range.direction === "past" ? addLocalCalendarDays(today, -(range.days - 1)) : today;
  const lastDate = range.direction === "past" ? today : addLocalCalendarDays(today, range.days - 1);
  return { firstDate, lastDate, start: getLocalDayRange(firstDate, timeZone).start, end: getLocalDayRange(lastDate, timeZone).end };
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; // Mongo $dayOfWeek: 1 = Sunday
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
const hourLabel = (hour) => `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? " AM" : " PM"}`;

// The MongoDB pipeline; one pass over the bookings of the range, split into facets.
export function buildReportPipeline({ start, end, timeZone }) {
  const active = { $match: { status: { $ne: "cancelled" } } };
  return [
    { $match: { startsAt: { $gte: start, $lt: end } } },
    { $facet: {
      status: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
      source: [{ $group: { _id: { $ifNull: ["$source", "online"] }, n: { $sum: 1 } } }],
      barber: [active, { $group: { _id: "$barberName", booked: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, noShow: { $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] } } } }, { $sort: { booked: -1, _id: 1 } }, { $limit: 30 }],
      service: [active, { $unwind: "$services" }, { $group: { _id: "$services.name", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 10 }],
      weekday: [active, { $group: { _id: { $dayOfWeek: { date: "$startsAt", timezone: timeZone } }, n: { $sum: 1 } } }],
      hour: [active, { $group: { _id: { $hour: { date: "$startsAt", timezone: timeZone } }, n: { $sum: 1 } } }],
    } },
  ];
}

// Raw facet output (plus the new-customer count) -> what the page shows. Rates are null when there is nothing to divide by.
export function shapeReport(facets = {}, { newCustomers = 0 } = {}) {
  const count = (rows, key) => rows?.find((row) => row._id === key)?.n ?? 0;
  const status = { confirmed: count(facets.status, "confirmed"), pending: count(facets.status, "pending"), completed: count(facets.status, "completed"), cancelled: count(facets.status, "cancelled"), noShow: count(facets.status, "no_show") };
  const total = Object.values(status).reduce((sum, value) => sum + value, 0);
  const attended = status.completed + status.noShow;

  const weekdayCounts = Array.from({ length: 7 }, (_, index) => ({ label: WEEKDAY_NAMES[index], n: count(facets.weekday, index + 1) }));
  const monFirst = [...weekdayCounts.slice(1), weekdayCounts[0]];
  const hours = (facets.hour ?? []).map((row) => ({ label: hourLabel(row._id), n: row.n, hour: row._id })).sort((a, b) => a.hour - b.hour).map(({ label, n }) => ({ label, n }));

  return {
    total,
    status,
    rates: { noShow: percent(status.noShow, attended), cancellation: percent(status.cancelled, total), completion: percent(status.completed, attended) },
    source: { online: count(facets.source, "online"), walkIn: count(facets.source, "walk-in") },
    barbers: (facets.barber ?? []).map((row) => ({ name: row._id || "Unknown", booked: row.booked, completed: row.completed, noShow: row.noShow })),
    services: (facets.service ?? []).map((row) => ({ name: row._id || "Unknown", n: row.n })),
    weekdays: monFirst,
    hours,
    newCustomers,
  };
}

export async function loadOperationalReport(db, { rangeKey, now = new Date(), timeZone }) {
  const bounds = reportBounds(rangeKey, now, timeZone);
  const [aggregated, newCustomers] = await Promise.all([
    db.collection("booking").aggregate(buildReportPipeline({ start: bounds.start, end: bounds.end, timeZone })).toArray(),
    db.collection("user").countDocuments({ role: "USER", createdAt: { $gte: bounds.start, $lt: bounds.end } }),
  ]);
  return { range: rangeKey, firstDate: bounds.firstDate, lastDate: bounds.lastDate, ...shapeReport(aggregated[0], { newCustomers }) };
}
