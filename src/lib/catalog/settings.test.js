import { describe, expect, it } from "vitest";
import { BOOKING_CONFIG } from "../../config/booking.js";
import { site } from "../../config/site.js";
import { docsToMap, isValidEmail, isValidPhone, mergeSiteSettings, normalizeHours, safeSocialUrl } from "./settings.js";

describe("validators", () => {
  it("accepts real phone numbers and emails only", () => {
    for (const ok of ["+1 (212) 555-0100", "212-555-0100", "2125550100"]) expect(isValidPhone(ok), ok).toBe(true);
    for (const bad of ["abc", "12", "555-01", "+1 212 555 0100 ext <b>", "1".repeat(31), "", null]) expect(isValidPhone(bad), String(bad)).toBe(false);
    expect(isValidEmail("hello@the-cut.example")).toBe(true);
    for (const bad of ["hello", "a@b", "a b@c.d", "<x>@y.z", null]) expect(isValidEmail(bad)).toBe(false);
  });

  it("accepts only https profile URLs on the platform's own domain", () => {
    expect(safeSocialUrl("instagram", "https://www.instagram.com/thecut")).toBe("https://www.instagram.com/thecut");
    expect(safeSocialUrl("x", "https://twitter.com/thecut")).toBe("https://twitter.com/thecut");
    expect(safeSocialUrl("youtube", "https://youtu.be/abc")).toBe("https://youtu.be/abc");
    for (const [platform, bad] of [["instagram", "http://instagram.com/x"], ["instagram", "javascript:alert(1)"], ["instagram", "https://evil.example/instagram.com"], ["instagram", "https://instagram.com.evil.example/x"], ["instagram", "https://user:pw@instagram.com/x"], ["facebook", "https://instagram.com/x"], ["nope", "https://instagram.com/x"], ["instagram", `https://instagram.com/${"a".repeat(200)}`]]) {
      expect(safeSocialUrl(platform, bad), bad).toBeNull();
    }
  });
});

describe("normalizeHours", () => {
  it("uses the file hours without a document and treats a saved document as authoritative per day", () => {
    expect(normalizeHours(null, BOOKING_CONFIG.openingHours)).toBe(BOOKING_CONFIG.openingHours);
    const saved = normalizeHours({ monday: { open: "10:00", close: "18:00" }, tuesday: { open: "10:00", close: "09:00" }, sunday: { open: "x", close: "y" } }, BOOKING_CONFIG.openingHours);
    expect(Object.keys(saved)).toEqual(["monday"]);
  });

  it("ignores a document with no valid day so a bad save cannot close the shop", () => {
    expect(normalizeHours({ monday: { open: "bad" } }, BOOKING_CONFIG.openingHours)).toBe(BOOKING_CONFIG.openingHours);
    expect(normalizeHours({}, BOOKING_CONFIG.openingHours)).toBe(BOOKING_CONFIG.openingHours);
  });
});

describe("mergeSiteSettings", () => {
  it("falls back to the file values (empty by default)", () => {
    const merged = mergeSiteSettings({}, site);
    expect(merged.contact).toEqual({ phone: null, email: null });
    expect(merged.location.city).toBe("New York");
    expect(Object.values(merged.social).every((value) => value === null)).toBe(true);
  });

  it("applies valid database values, clears with empty strings and rejects invalid ones", () => {
    const merged = mergeSiteSettings({
      contact: { phone: " +1 212 555 0100 ", email: "not-an-email", streetAddress: "1 Main St", postalCode: "10001" },
      social: { instagram: "https://instagram.com/thecut", facebook: "javascript:alert(1)", tiktok: "" },
    }, site);
    expect(merged.contact).toEqual({ phone: "+1 212 555 0100", email: null });
    expect(merged.location).toMatchObject({ streetAddress: "1 Main St", postalCode: "10001", city: "New York" });
    expect(merged.social.instagram).toBe("https://instagram.com/thecut");
    expect(merged.social.facebook).toBeNull();
    expect(merged.social.tiktok).toBeNull();
  });

  it("builds the map from documents and ignores unknown keys", () => {
    expect(docsToMap([{ key: "contact", value: { phone: "x" } }, { key: "evil", value: { a: 1 } }, null, { key: "hours", value: null }])).toEqual({ contact: { phone: "x" } });
    expect(docsToMap(undefined)).toEqual({});
  });
});
