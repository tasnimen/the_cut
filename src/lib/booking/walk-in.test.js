import { describe, expect, it } from "vitest";
import { isWalkInUserId, walkInClock, walkInFieldErrors, WalkInAvailabilitySchema, WalkInBookingSchema } from "@/lib/booking/walk-in";

const ok = { customerName: "Sam Carter", phone: "(212) 555-0147", serviceSlugs: ["haircut"], startsAt: "2027-04-05T14:00:00.000Z", barber: "any" };

describe("WalkInBookingSchema", () => {
  it("accepts a normal walk-in and defaults phone and barber", () => {
    expect(WalkInBookingSchema.safeParse(ok).success).toBe(true);
    const minimal = WalkInBookingSchema.parse({ customerName: "Sam", serviceSlugs: ["haircut"], startsAt: ok.startsAt });
    expect(minimal).toMatchObject({ phone: "", barber: "any" });
  });
  it("rejects missing names, markup, bad phones, no or too many or repeated services, and unknown keys", () => {
    for (const bad of [
      { ...ok, customerName: "S" }, { ...ok, customerName: "<b>x</b>" }, { ...ok, phone: "123" },
      { ...ok, serviceSlugs: [] }, { ...ok, serviceSlugs: ["a", "b", "c", "d"] }, { ...ok, serviceSlugs: ["a", "a"] },
      { ...ok, startsAt: "tomorrow" }, { ...ok, priceMinorUnits: 1 }, { ...ok, userId: "x" },
    ]) expect(WalkInBookingSchema.safeParse(bad).success).toBe(false);
  });
  it("reports one message per field", () => {
    const errors = walkInFieldErrors(WalkInBookingSchema.safeParse({ ...ok, customerName: "", serviceSlugs: [] }).error);
    expect(errors.customerName).toBeTruthy();
    expect(errors.serviceSlugs).toBeTruthy();
  });
});

describe("walk-in helpers", () => {
  it("validates availability queries", () => {
    expect(WalkInAvailabilitySchema.safeParse({ date: "2027-04-05", serviceSlugs: ["haircut"] }).success).toBe(true);
    expect(WalkInAvailabilitySchema.safeParse({ date: "04/05/2027", serviceSlugs: ["haircut"] }).success).toBe(false);
  });
  it("recognizes walk-in owners and shifts the clock back by the lead time", () => {
    expect(isWalkInUserId("walkin:abc")).toBe(true);
    expect(isWalkInUserId("507f1f77bcf86cd799439011")).toBe(false);
    expect(isWalkInUserId(undefined)).toBe(false);
    expect(walkInClock(new Date("2027-04-05T14:00:00Z"), 60).toISOString()).toBe("2027-04-05T13:00:00.000Z");
  });
});
