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
