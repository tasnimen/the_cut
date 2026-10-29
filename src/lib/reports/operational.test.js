import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_RANGE, buildReportPipeline, loadOperationalReport, parseReportRange, reportBounds, shapeReport } from "@/lib/reports/operational";

const TZ = "America/New_York";

describe("parseReportRange", () => {
  it("accepts known ranges only", () => {
    expect(parseReportRange({ range: "last7" })).toBe("last7");
    expect(parseReportRange({ range: ["next7", "last7"] })).toBe("next7");
    for (const bad of [{ range: "last9999" }, { range: { $ne: "" } }, { range: "__proto__" }, {}]) expect(parseReportRange(bad)).toBe(DEFAULT_REPORT_RANGE);
  });
});

describe("reportBounds", () => {
  const now = new Date("2026-11-04T15:00:00Z"); // 10 AM in New York, Wednesday
  it("covers whole business days, ending after today for past ranges", () => {
    const bounds = reportBounds("last7", now, TZ);
    expect(bounds.firstDate).toBe("2026-10-29");
    expect(bounds.lastDate).toBe("2026-11-04");
    expect(bounds.start.toISOString()).toBe("2026-10-29T04:00:00.000Z"); // midnight EDT
    expect(bounds.end.toISOString()).toBe("2026-11-05T05:00:00.000Z"); // midnight EST after the clock change
  });
  it("starts today for the next 7 days", () => {
    const bounds = reportBounds("next7", now, TZ);
    expect([bounds.firstDate, bounds.lastDate]).toEqual(["2026-11-04", "2026-11-10"]);
  });
  it("uses the shop's day, not UTC, near midnight", () => {
    expect(reportBounds("last7", new Date("2026-11-05T02:00:00Z"), TZ).lastDate).toBe("2026-11-04"); // 9 PM the evening before in New York
  });
});

describe("buildReportPipeline", () => {
  it("filters the range first and uses the shop's time zone for weekday and hour", () => {
    const start = new Date("2026-10-01");
    const end = new Date("2026-11-01");
    const pipeline = buildReportPipeline({ start, end, timeZone: TZ });
    expect(pipeline[0]).toEqual({ $match: { startsAt: { $gte: start, $lt: end } } });
    const facets = pipeline[1].$facet;
    expect(facets.weekday[1].$group._id.$dayOfWeek.timezone).toBe(TZ);
    expect(facets.hour[1].$group._id.$hour.timezone).toBe(TZ);
    expect(JSON.stringify(pipeline)).not.toMatch(/price|totalPrice/i);
  });
});

describe("shapeReport", () => {
  const facets = {
    status: [{ _id: "completed", n: 8 }, { _id: "no_show", n: 2 }, { _id: "cancelled", n: 5 }, { _id: "confirmed", n: 5 }],
    source: [{ _id: "online", n: 18 }, { _id: "walk-in", n: 2 }],
    barber: [{ _id: "Alex", booked: 10, completed: 7, noShow: 1 }, { _id: null, booked: 1, completed: 0, noShow: 0 }],
    service: [{ _id: "Haircut", n: 12 }],
    weekday: [{ _id: 2, n: 4 }, { _id: 1, n: 1 }],
    hour: [{ _id: 14, n: 3 }, { _id: 9, n: 5 }, { _id: 12, n: 1 }],
  };
  it("totals, rates, and ordering", () => {
    const report = shapeReport(facets, { newCustomers: 4 });
    expect(report.total).toBe(20);
    expect(report.status).toEqual({ confirmed: 5, pending: 0, completed: 8, cancelled: 5, noShow: 2 });
    expect(report.rates).toEqual({ noShow: 20, cancellation: 25, completion: 80 });
    expect(report.source).toEqual({ online: 18, walkIn: 2 });
    expect(report.barbers[1].name).toBe("Unknown");
    expect(report.weekdays.map((day) => day.label)).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    expect(report.weekdays[0].n).toBe(4);
    expect(report.weekdays[6].n).toBe(1);
    expect(report.hours.map((hour) => hour.label)).toEqual(["9 AM", "12 PM", "2 PM"]);
    expect(report.newCustomers).toBe(4);
  });
  it("never divides by zero", () => {
    const empty = shapeReport({}, {});
    expect(empty.total).toBe(0);
    expect(empty.rates).toEqual({ noShow: null, cancellation: null, completion: null });
    expect(empty.weekdays).toHaveLength(7);
  });
  it("contains no money or personal fields", () => {
    const text = JSON.stringify(shapeReport(facets, {}));
    expect(text).not.toMatch(/price|revenue|takings|email|phone|customerName|userId/i);
  });
});

describe("loadOperationalReport", () => {
  it("runs one aggregate on bookings and one count of new customers", async () => {
    const seen = {};
    const db = { collection: (name) => ({
      aggregate: (pipeline) => { seen.pipeline = pipeline; return { toArray: async () => [{ status: [{ _id: "completed", n: 1 }], source: [], barber: [], service: [], weekday: [], hour: [] }] }; },
      countDocuments: async (query) => { seen.users = { name, query }; return 3; },
    }) };
    const report = await loadOperationalReport(db, { rangeKey: "last7", now: new Date("2026-11-04T15:00:00Z"), timeZone: TZ });
    expect(report).toMatchObject({ range: "last7", firstDate: "2026-10-29", lastDate: "2026-11-04", total: 1, newCustomers: 3 });
    expect(seen.users.name).toBe("user");
    expect(seen.users.query.role).toBe("USER");
    expect(seen.pipeline[0].$match.startsAt.$gte.toISOString()).toBe("2026-10-29T04:00:00.000Z");
  });
});
