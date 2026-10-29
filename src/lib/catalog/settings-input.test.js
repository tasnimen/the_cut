import { describe, expect, it } from "vitest";
import { readContactForm, readHoursForm, readHolidaysForm, readSocialForm } from "./settings-input.js";

const form = (values) => { const data = new Map(Object.entries(values)); return { get: (key) => (data.has(key) ? data.get(key) : null) }; };

describe("readHoursForm", () => {
  it("builds open days only and ignores unworked ones", () => {
    const result = readHoursForm(form({ day_monday_works: "on", day_monday_open: "09:00", day_monday_close: "19:00", day_tuesday_open: "10:00", day_tuesday_close: "11:00" }));
    expect(result).toMatchObject({ ok: true, data: { monday: { open: "09:00", close: "19:00" } } });
    expect(Object.keys(result.data)).toEqual(["monday"]);
  });

  it("rejects off-grid, too-short and empty weeks", () => {
    expect(readHoursForm(form({ day_monday_works: "on", day_monday_open: "09:10", day_monday_close: "19:00" })).fieldErrors.day_monday).toBeTruthy();
    expect(readHoursForm(form({ day_monday_works: "on", day_monday_open: "09:00", day_monday_close: "09:30" })).fieldErrors.day_monday).toBeTruthy();
    expect(readHoursForm(form({})).fieldErrors.hours).toBeTruthy();
  });
});

describe("readHolidaysForm", () => {
  it("parses flags, early close and sorted unique dates", () => {
    const result = readHolidaysForm(form({ thanksgiving: "on", december24EarlyClose: "on", december24EarlyCloseAt: "13:30", additionalClosedDates: "2027-12-31\n2027-01-02, 2027-01-02" }));
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ thanksgiving: true, christmasDay: false, december24EarlyClose: true, december24EarlyCloseAt: "13:30", additionalClosedDates: ["2027-01-02", "2027-12-31"] });
  });

  it("rejects invalid dates, a missing early-close time and ignores unknown keys", () => {
    expect(readHolidaysForm(form({ additionalClosedDates: "2027-02-30" })).fieldErrors.additionalClosedDates).toBeTruthy();
    expect(readHolidaysForm(form({ december24EarlyClose: "on", december24EarlyCloseAt: "25:00" })).fieldErrors.december24EarlyCloseAt).toBeTruthy();
    expect(Object.keys(readHolidaysForm(form({ role: "ADMIN" })).data).sort()).toEqual(["additionalClosedDates", "christmasDay", "december24EarlyClose", "december24EarlyCloseAt", "independenceDay", "laborDay", "memorialDay", "newYearsDay", "thanksgiving"]);
  });
});

describe("readContactForm", () => {
  it("stores empty fields as null and normalizes the email", () => {
    expect(readContactForm(form({ phone: " +1 212 555 0100 ", email: "Hello@The-Cut.Example", streetAddress: "1 Main St", postalCode: "10001" }))).toMatchObject({ ok: true, data: { phone: "+1 212 555 0100", email: "hello@the-cut.example", streetAddress: "1 Main St", postalCode: "10001" } });
    expect(readContactForm(form({})).data).toEqual({ phone: null, email: null, streetAddress: null, postalCode: null });
  });

  it("rejects bad phone, email and a postal code without a street", () => {
    const result = readContactForm(form({ phone: "call me", email: "nope", postalCode: "10001" }));
    expect(result.fieldErrors).toMatchObject({ phone: expect.any(String), email: expect.any(String), streetAddress: expect.any(String) });
  });
});

describe("readSocialForm", () => {
  it("accepts https profile links and clears blanks", () => {
    expect(readSocialForm(form({ instagram: "https://instagram.com/thecut", facebook: "" })).data).toMatchObject({ instagram: "https://instagram.com/thecut", facebook: null, tiktok: null });
  });

  it("rejects wrong domains, http and script URLs", () => {
    const result = readSocialForm(form({ instagram: "https://facebook.com/x", facebook: "http://facebook.com/x", tiktok: "javascript:alert(1)" }));
    expect(Object.keys(result.fieldErrors).sort()).toEqual(["facebook", "instagram", "tiktok"]);
  });
});
