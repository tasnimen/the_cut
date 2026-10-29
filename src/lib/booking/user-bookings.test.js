import { describe, expect, it } from "vitest";
import { bookingChangeOptions, bookingErrorMessage, splitBookings, summarize } from "./user-bookings.js";

const at = (iso, minutes = 30) => ({ startsAt: iso, endsAt: new Date(new Date(iso).getTime() + minutes * 60_000).toISOString() });
const booking = (id, status, iso) => ({ id, status, ...at(iso) });
const now = new Date("2027-04-05T12:00:00Z");

describe("splitBookings", () => {
  const list = [
    booking("past-done", "completed", "2027-03-01T15:00:00Z"),
    booking("later", "confirmed", "2027-04-20T15:00:00Z"),
    booking("soon", "confirmed", "2027-04-07T15:00:00Z"),
    booking("cancelled-future", "cancelled", "2027-04-10T15:00:00Z"),
    booking("pending", "pending", "2027-04-09T15:00:00Z"),
    booking("confirmed-but-past", "confirmed", "2027-04-01T15:00:00Z"),
    booking("noshow", "no_show", "2027-02-01T15:00:00Z"),
  ];

  it("puts future active bookings first-to-last and everything else into history, newest first", () => {
    const { upcoming, history } = splitBookings(list, now);
    expect(upcoming.map((item) => item.id)).toEqual(["soon", "pending", "later"]);
    expect(history.map((item) => item.id)).toEqual(["cancelled-future", "confirmed-but-past", "past-done", "noshow"]);
  });

  it("summarizes real counts and the next appointment, and handles an empty list", () => {
    expect(summarize(list, now)).toMatchObject({ upcomingCount: 3, completedCount: 1, cancelledCount: 1, next: { id: "soon" } });
    expect(summarize([], now)).toEqual({ upcomingCount: 0, completedCount: 0, cancelledCount: 0, next: null });
  });
});

describe("bookingChangeOptions (24-hour rule)", () => {
  it("allows changes up to 24 hours before the start and not after", () => {
    const start = "2027-04-06T12:00:00Z";
    expect(bookingChangeOptions(booking("a", "confirmed", start), { now: new Date("2027-04-05T11:59:00Z"), cutoffHours: 24 })).toMatchObject({ canCancel: true, canReschedule: true });
    expect(bookingChangeOptions(booking("a", "confirmed", start), { now: new Date("2027-04-05T12:00:00Z"), cutoffHours: 24 })).toMatchObject({ canCancel: true, canReschedule: true });
    expect(bookingChangeOptions(booking("a", "confirmed", start), { now: new Date("2027-04-05T12:00:01Z"), cutoffHours: 24 })).toMatchObject({ canCancel: false, canReschedule: false });
  });

  it("lets a pending booking be cancelled but not rescheduled, and nothing else once finished", () => {
    const start = "2027-04-20T12:00:00Z";
    expect(bookingChangeOptions(booking("p", "pending", start), { now, cutoffHours: 24 })).toMatchObject({ canCancel: true, canReschedule: false });
    for (const status of ["completed", "cancelled", "no_show"]) {
      expect(bookingChangeOptions(booking("x", status, start), { now, cutoffHours: 24 })).toMatchObject({ canCancel: false, canReschedule: false });
    }
  });
});

describe("bookingErrorMessage", () => {
  it("returns friendly text and never the raw code", () => {
    for (const code of ["cancellation_cutoff_passed", "booking_not_found", "slot_just_taken", "something_weird", undefined]) {
      const message = bookingErrorMessage(code);
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toMatch(/_/);
    }
    expect(bookingErrorMessage("reschedule_cutoff_passed")).toMatch(/24 hours/);
  });
});
