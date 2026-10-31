import { describe, expect, it } from "vitest";
import { bookAgainHref, rescheduleSnapshot } from "./snapshot.js";

const booking = { services: [{ slug: "haircut", name: "Haircut", priceMinorUnits: 3500 }, { slug: "beard-trim", name: "Beard Trim", priceMinorUnits: 1500 }], totalPriceMinorUnits: 5000 };

describe("booking snapshot", () => {
  it("keeps the original services, names, prices and total on reschedule", () => {
    expect(rescheduleSnapshot(booking)).toEqual({ services: booking.services, totalPriceMinorUnits: 5000 });
  });
  it("builds a book again link with the same services", () => {
    expect(bookAgainHref(booking)).toBe("/booking?service=haircut&service=beard-trim");
    expect(bookAgainHref({})).toBe("/booking?");
  });
});
