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
