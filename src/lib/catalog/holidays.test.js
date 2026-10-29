import { describe, expect, it } from "vitest";
import { BOOKING_CONFIG } from "../../config/booking.js";
import { generateCandidateSlots } from "../booking/rules.js";
import { isValidDateString, isValidTime, mergeBookingConfig, normalizeHolidays } from "./holidays.js";

describe("date and time validation", () => {
  it("accepts real calendar dates only", () => {
    expect(isValidDateString("2027-02-28")).toBe(true);
    expect(isValidDateString("2028-02-29")).toBe(true);
    for (const bad of ["2027-02-29", "2027-13-01", "2027-00-10", "2027-1-1", "27-01-01", "2027-01-32", "x", null, 20270101]) expect(isValidDateString(bad), String(bad)).toBe(false);
    expect(isValidTime("14:00")).toBe(true);
    for (const bad of ["24:00", "9:00", "14:60", "", null]) expect(isValidTime(bad)).toBe(false);
  });
});

describe("normalizeHolidays", () => {
  it("returns the file defaults when there is no document", () => {
    expect(normalizeHolidays(null, BOOKING_CONFIG.holidays)).toEqual(BOOKING_CONFIG.holidays);
    expect(normalizeHolidays(undefined, BOOKING_CONFIG.holidays).additionalClosedDates).toEqual([]);
  });

  it("overrides field by field and ignores invalid values", () => {
    const result = normalizeHolidays({ memorialDay: true, laborDay: "yes", thanksgiving: false, december24EarlyClose: true, december24EarlyCloseAt: "13:30", additionalClosedDates: ["2027-01-02", "2027-01-02", "bad", "2026-12-31"] }, BOOKING_CONFIG.holidays);
    expect(result).toMatchObject({ memorialDay: true, laborDay: false, thanksgiving: false, christmasDay: true, december24EarlyClose: true, december24EarlyCloseAt: "13:30" });
    expect(result.additionalClosedDates).toEqual(["2026-12-31", "2027-01-02"]);
    expect(normalizeHolidays({ december24EarlyCloseAt: "25:00" }, BOOKING_CONFIG.holidays).december24EarlyCloseAt).toBe("14:00");
  });

  it("caps the number of extra closed dates and never mutates the defaults", () => {
    const many = Array.from({ length: 300 }, (_, i) => `2027-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`);
    expect(normalizeHolidays({ additionalClosedDates: many }, BOOKING_CONFIG.holidays).additionalClosedDates.length).toBeLessThanOrEqual(120);
    expect(BOOKING_CONFIG.holidays.additionalClosedDates).toEqual([]);
  });
});

describe("closed dates reach the booking engine", () => {
  const barber = { weeklySchedule: { monday: { open: "09:00", close: "19:00" } }, breaks: {}, daysOff: [] };
  const base = { localDate: "2027-04-05", services: [{ durationMinutes: 30 }], barber, now: new Date("2027-04-01T10:00:00Z") };

  it("offers slots on an open Monday and none once an admin closes that date", () => {
    expect(generateCandidateSlots({ ...base, config: BOOKING_CONFIG }).length).toBeGreaterThan(0);
    const closed = mergeBookingConfig(BOOKING_CONFIG, normalizeHolidays({ additionalClosedDates: ["2027-04-05"] }, BOOKING_CONFIG.holidays));
    expect(generateCandidateSlots({ ...base, config: closed })).toEqual([]);
  });
});
