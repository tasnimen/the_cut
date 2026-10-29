import { describe, expect, it } from "vitest";
import { BOOKING_CONFIG } from "@/config/booking";
import { generateCandidateSlots, reservationSlotStarts, calculateBookingDuration } from "@/lib/booking/rules";
import { getBusinessHours, possibleInstantsForLocalTime } from "@/lib/booking/time";
import { canTransitionBooking, transitionBooking } from "@/lib/booking/state-machine";

const barber = {
  id: "barber-1",
  daysOff: [],
  weeklySchedule: { monday: { open: "09:00", close: "19:00" } },
  breaks: {},
};

describe("booking rules", () => {
  it("rounds each service up to the 15 minute slot grid and reserves the cleanup buffer", () => {
    expect(calculateBookingDuration([{ durationMinutes: 31 }, { durationMinutes: 20 }])).toBe(75);
    expect(reservationSlotStarts(new Date("2027-04-05T14:00:00.000Z"), 30)).toHaveLength(3);
  });

  it("blocks lunch, barber days off, and configured holidays", () => {
    const lunch = { ...barber, breaks: { monday: { open: "12:00", close: "13:00" } } };
    const common = { localDate: "2027-04-05", services: [{ durationMinutes: 30 }], now: new Date("2027-04-05T10:00:00Z"), config: BOOKING_CONFIG };
    const lunchSlots = generateCandidateSlots({ ...common, barber: lunch });
    expect(lunchSlots.some((slot) => slot.startsAt === "2027-04-05T16:00:00.000Z")).toBe(false);
    expect(generateCandidateSlots({ ...common, barber: { ...barber, daysOff: ["2027-04-05"] } })).toEqual([]);
    expect(getBusinessHours("2027-12-25")).toBeNull();
  });

  it("keeps repeated fall-back wall times distinct and rejects nonexistent spring times", () => {
    expect(possibleInstantsForLocalTime("2027-11-07T01:30", "America/New_York")).toHaveLength(2);
    expect(possibleInstantsForLocalTime("2027-03-14T02:30", "America/New_York")).toHaveLength(0);
  });

  it("enforces the no-show state transition", () => {
    expect(canTransitionBooking("confirmed", "no_show")).toBe(true);
    expect(canTransitionBooking("cancelled", "no_show")).toBe(false);
    expect(() => transitionBooking("cancelled", "no_show")).toThrow("booking_state_transition_invalid");
  });
});

describe("booking policy config vs docs", () => {
  it("matches the documented policy values", () => {
    expect(BOOKING_CONFIG).toMatchObject({
      timeZone: "America/New_York", currency: "USD", slotMinutes: 15, cleanupBufferMinutes: 5,
      minimumLeadMinutes: 60, maximumAdvanceDays: 30, maximumServicesPerBooking: 3,
      maximumActiveBookingsPerUser: 2, cancellationCutoffHours: 24, depositEnabled: false, paymentLocation: "at_shop",
    });
  });

  it("enforces the one-hour lead time and the 30-day window", () => {
    const base = { services: [{ durationMinutes: 30 }], config: BOOKING_CONFIG, barber };
    // 2027-04-05 is a Monday; 13:00Z is 9:00 AM New York.
    const now = new Date("2027-04-05T13:00:00Z");
    const today = generateCandidateSlots({ ...base, localDate: "2027-04-05", now });
    expect(today.every((slot) => new Date(slot.startsAt).getTime() >= now.getTime() + 60 * 60 * 1000)).toBe(true);
    expect(generateCandidateSlots({ ...base, localDate: "2027-05-03", now }).length).toBeGreaterThan(0);
    expect(generateCandidateSlots({ ...base, localDate: "2027-05-10", now })).toEqual([]);
  });
});

describe("service record validation", () => {
  it("accepts real database service documents that carry extra fields", async () => {
    const { BookingServiceFieldsSchema } = await import("@/lib/booking/booking-model");
    const record = { _id: "x", slug: "haircut", name: "Haircut", description: "d", durationMinutes: 30, priceMinorUnits: 2500, currency: "USD", active: true, displayOrder: 1, createdAt: new Date(), updatedAt: new Date() };
    expect(BookingServiceFieldsSchema.safeParse(record).success).toBe(true);
    expect(BookingServiceFieldsSchema.safeParse({ ...record, currency: "EUR" }).success).toBe(false);
  });
});
