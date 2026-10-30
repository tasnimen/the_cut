import { describe, expect, it } from "vitest";
import { adminAllowedActions, adminErrorMessage, summarizeDay } from "@/lib/booking/admin-bookings";

const start = "2026-11-03T14:00:00.000Z";
const at = (iso) => ({ now: new Date(iso), graceMinutes: 15 });

describe("adminAllowedActions", () => {
  it("lets a future confirmed booking only be cancelled", () => {
    expect(adminAllowedActions({ status: "confirmed", startsAt: start }, at("2026-11-03T13:00:00Z"))).toEqual(["cancelled"]);
  });
  it("allows completing once the appointment started, no-show after the grace period", () => {
    expect(adminAllowedActions({ status: "confirmed", startsAt: start }, at("2026-11-03T14:05:00Z"))).toEqual(["completed", "cancelled"]);
    expect(adminAllowedActions({ status: "confirmed", startsAt: start }, at("2026-11-03T14:15:00Z"))).toEqual(["completed", "no_show", "cancelled"]);
  });
  it("lets a pending booking be confirmed or cancelled", () => {
    expect(adminAllowedActions({ status: "pending", startsAt: start }, at("2026-11-03T13:00:00Z"))).toEqual(["confirmed", "cancelled"]);
  });
  it("allows nothing on finished bookings", () => {
    for (const status of ["completed", "cancelled", "no_show"]) {
      expect(adminAllowedActions({ status, startsAt: start }, at("2026-11-03T20:00:00Z"))).toEqual([]);
    }
  });
});

describe("summarizeDay", () => {
  it("counts statuses and totals only confirmed and completed bookings", () => {
    const summary = summarizeDay([
      { status: "confirmed", totalPriceMinorUnits: 4000, currency: "USD" },
      { status: "completed", totalPriceMinorUnits: 2500, currency: "USD" },
      { status: "cancelled", totalPriceMinorUnits: 9900, currency: "USD" },
      { status: "no_show", totalPriceMinorUnits: 1000, currency: "USD" },
    ]);
    expect(summary).toMatchObject({ total: 4, active: 1, expected: "$65.00" });
    expect(summary.counts).toMatchObject({ confirmed: 1, completed: 1, cancelled: 1, no_show: 1, pending: 0 });
  });
  it("handles an empty day", () => {
    expect(summarizeDay([])).toMatchObject({ total: 0, expected: "$0.00" });
  });
});

describe("adminErrorMessage", () => {
  it("is friendly and never echoes unknown codes", () => {
    expect(adminErrorMessage("late_arrival_grace_not_elapsed")).toMatch(/grace/);
    expect(adminErrorMessage("weird_internal_code")).not.toMatch(/weird/);
  });
});

import { buildBookingQuery, filtersToQueryString, parseBookingFilters } from "@/lib/booking/admin-bookings";

describe("parseBookingFilters", () => {
  it("keeps valid values and drops anything malformed", () => {
    const filters = parseBookingFilters({ q: "  sam\u0000  ", status: "confirmed", barber: "a".repeat(24), from: "2026-11-01", to: "2026-13-45", page: "3" });
    expect(filters).toEqual({ q: "sam", status: "confirmed", barber: "a".repeat(24), from: "2026-11-01", to: "2026-13-45", page: 3 });
    const strict = parseBookingFilters({ status: "deleted", barber: "x", from: "2026-13-45", page: "-4" }, { isValidDate: (v) => v === "2026-11-01" });
    expect(strict).toMatchObject({ status: "", barber: "", from: "", page: 1 });
  });
  it("uses the first value of repeated params and caps the search length and page", () => {
    const filters = parseBookingFilters({ q: ["one", "two"], page: "99999" });
    expect(filters.q).toBe("one");
    expect(filters.page).toBe(1000);
    expect(parseBookingFilters({ q: "x".repeat(500) }).q).toHaveLength(60);
  });
  it("ignores objects smuggled in as values", () => {
    expect(parseBookingFilters({ status: { $ne: "" }, barber: { $gt: "" } })).toMatchObject({ status: "", barber: "" });
  });
});

describe("buildBookingQuery", () => {
  const deps = { range: (date) => ({ start: new Date(`${date}T05:00:00Z`), end: new Date(`${date}T23:59:59Z`) }), toObjectId: (value) => `oid:${value}` };
  it("builds exact filters and a date range", () => {
    const query = buildBookingQuery({ q: "", status: "no_show", barber: "b1", from: "2026-11-01", to: "2026-11-30", page: 1 }, deps);
    expect(query).toMatchObject({ status: "no_show", barberId: "b1" });
    expect(query.startsAt.$gte).toEqual(new Date("2026-11-01T05:00:00Z"));
    expect(query.startsAt.$lt).toEqual(new Date("2026-11-30T23:59:59Z"));
  });
  it("escapes regex characters in the search and adds phone and id matches only when they make sense", () => {
    const query = buildBookingQuery({ q: "a.b(c", status: "", barber: "", from: "", to: "", page: 1 }, deps);
    expect(query.$or).toHaveLength(1);
    expect(query.$or[0].customerName.$regex).toBe("a\\.b\\(c");
    const phone = buildBookingQuery({ q: "(555) 010-1234", status: "", barber: "", from: "", to: "", page: 1 }, deps);
    expect(phone.$or.some((clause) => clause.phoneE164?.$regex === "5550101234")).toBe(true);
    const id = buildBookingQuery({ q: "a".repeat(24), status: "", barber: "", from: "", to: "", page: 1 }, deps);
    expect(id.$or.some((clause) => clause._id === `oid:${"a".repeat(24)}`)).toBe(true);
  });
  it("returns an empty query for no filters", () => {
    expect(buildBookingQuery({ q: "", status: "", barber: "", from: "", to: "", page: 1 }, deps)).toEqual({});
  });
});

describe("filtersToQueryString", () => {
  it("omits empty values and page 1", () => {
    expect(filtersToQueryString({ q: "sam", status: "", barber: "", from: "", to: "", page: 1 })).toBe("?q=sam");
    expect(filtersToQueryString({ q: "sam", status: "", barber: "", from: "", to: "", page: 1 }, { page: 3 })).toBe("?q=sam&page=3");
    expect(filtersToQueryString({ q: "", status: "", barber: "", from: "", to: "", page: 1 })).toBe("");
  });
});

import { permittedActions } from "@/lib/booking/admin-bookings";

describe("permittedActions", () => {
  const all = ["completed", "no_show", "cancelled"];
  it("keeps what the Super Admin allows: Cancel needs bookings.cancel, the rest bookings.changeStatus", () => {
    expect(permittedActions(all, { "bookings.cancel": true, "bookings.changeStatus": true })).toEqual(all);
    expect(permittedActions(all, { "bookings.cancel": false, "bookings.changeStatus": true })).toEqual(["completed", "no_show"]);
    expect(permittedActions(all, { "bookings.cancel": true, "bookings.changeStatus": false })).toEqual(["cancelled"]);
    expect(permittedActions(all, {})).toEqual([]);
    expect(permittedActions(all, undefined)).toEqual([]);
  });
});
