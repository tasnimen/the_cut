import { describe, expect, it } from "vitest";
import { BOOKING_CONFIG } from "../../config/booking.js";
import { formatAddress, formatOpeningHours, mailtoHref, mapsHref, socialLinks, telHref } from "./contact.js";

describe("site contact helpers", () => {
  it("builds tel and mailto links only for valid values", () => {
    expect(telHref("+1 (212) 555-0100")).toBe("tel:+12125550100");
    expect(telHref("12")).toBeNull();
    expect(telHref(null)).toBeNull();
    expect(mailtoHref("hello@example.com")).toBe("mailto:hello@example.com");
    expect(mailtoHref("not an email")).toBeNull();
    expect(mailtoHref(undefined)).toBeNull();
  });

  it("builds a Maps link only when a street address is set", () => {
    expect(mapsHref({ city: "New York", region: "NY", streetAddress: null })).toBeNull();
    const location = { city: "New York", region: "NY", postalCode: "10001", streetAddress: "1 Main St" };
    expect(formatAddress(location)).toBe("1 Main St, New York, NY 10001");
    expect(mapsHref(location)).toBe("https://www.google.com/maps/search/?api=1&query=1%20Main%20St%2C%20New%20York%2C%20NY%2010001");
  });

  it("groups opening hours from the booking config", () => {
    expect(formatOpeningHours(BOOKING_CONFIG.openingHours)).toEqual([
      { days: "Mon–Fri", hours: "9:00 AM – 7:00 PM" },
      { days: "Sat", hours: "9:00 AM – 5:00 PM" },
      { days: "Sun", hours: "10:00 AM – 3:00 PM" },
    ]);
  });

  it("keeps only https social URLs", () => {
    expect(socialLinks({ instagram: "https://instagram.com/x", facebook: null, x: "http://insecure.example", tiktok: "" })).toEqual([{ name: "instagram", url: "https://instagram.com/x" }]);
    expect(socialLinks(undefined)).toEqual([]);
  });
});

import { formatClosures, timeZoneLabel } from "./contact.js";

describe("hours helpers", () => {
  it("labels the business time zone", () => {
    expect(timeZoneLabel("America/New_York")).toBe("ET");
    expect(timeZoneLabel("Europe/Paris")).toBe("Europe/Paris");
  });

  it("lists enabled holiday closures and the early close from the booking config", () => {
    expect(formatClosures(BOOKING_CONFIG.holidays)).toEqual({
      closed: ["New Year's Day", "Independence Day", "Thanksgiving", "Christmas Day"],
      extraDates: [],
      earlyClose: null,
    });
    expect(formatClosures({ memorialDay: true, december24EarlyClose: true, december24EarlyCloseAt: "14:00", additionalClosedDates: ["2027-01-02"] })).toEqual({
      closed: ["Memorial Day"],
      extraDates: ["2027-01-02"],
      earlyClose: "Dec 24: closes 2:00 PM",
    });
  });
});
