import { describe, expect, it } from "vitest";
import { BOOKING_EVENTS, buildBookingEmail, manageUrl, policyText, shopDetails } from "./booking.js";
import { bodyFragment } from "./layout.js";

const baseUrl = "https://cut.example.test";
const shop = shopDetails({ name: "The Cut Barbershop", brand: { main: "THE CUT", sub: "BARBERSHOP" }, contact: { phone: "+1 212 555 0100", email: "hello@example.test" }, location: { streetAddress: "1 Main St", city: "New York", region: "NY", postalCode: "10001" } });
const booking = (extra = {}) => ({
  id: "6ae4a05597700686ec5d6e8f", customerName: "Sam Carter", phone: "+12125550101", status: "confirmed",
  services: [{ name: "Haircut" }, { name: "Beard Trim" }], barber: { id: "b1", name: "Daniel Carter" },
  startsAt: "2026-11-09T15:00:00.000Z", endsAt: "2026-11-09T15:50:00.000Z", durationMinutes: 50, totalPriceMinorUnits: 11500, currency: "USD",
  updatedAt: new Date("2026-10-31T12:00:00Z"), ...extra,
});
const build = (event, extra = {}) => buildBookingEmail({ event, booking: booking(extra.booking), shop, baseUrl, previousStartsAt: extra.previousStartsAt, reason: extra.reason, now: new Date("2026-10-31T12:00:00Z") });

describe("booking email templates", () => {
  it("builds every event with a subject, an HTML and a plain-text version", () => {
    for (const event of Object.keys(BOOKING_EVENTS)) {
      const mail = build(event);
      expect(mail.subject, event).toContain("The Cut Barbershop");
      expect(mail.html, event).toContain("<!doctype html>");
      expect(mail.text, event).not.toMatch(/<[a-z][^>]*>/i);
      expect(mail.text, event).toContain("Daniel Carter");
      expect(mail.audience).toBe(BOOKING_EVENTS[event].audience);
    }
  });

  it("shows the time in the shop's zone with ET, on both sides of the daylight saving change", () => {
    expect(build("confirmed").text).toContain("Monday, November 9, 2026 at 10:00 AM ET");
    expect(build("confirmed", { booking: { startsAt: "2026-10-31T20:00:00.000Z", endsAt: "2026-10-31T20:30:00.000Z" } }).text).toContain("Saturday, October 31, 2026 at 4:00 PM ET");
    expect(build("confirmed", { booking: { startsAt: "2026-11-01T18:15:00.000Z", endsAt: "2026-11-01T18:45:00.000Z" } }).text).toContain("Sunday, November 1, 2026 at 1:15 PM ET");
  });

  it("includes services, barber, duration, price before tax, address, phone, policy and the manage button", () => {
    const mail = build("confirmed");
    for (const part of ["Haircut, Beard Trim", "Daniel Carter", "50 minutes", "$115.00 before tax", "1 Main St, New York, NY 10001", "Phone: +1 212 555 0100", policyText()]) expect(mail.text, part).toContain(part);
    expect(mail.text).toContain(`Manage your booking: ${manageUrl(baseUrl)}`);
    expect(manageUrl(baseUrl)).toBe("https://cut.example.test/sign-in?callbackUrl=%2Fuser%2Fappointments");
    expect(mail.html).toContain('href="https://cut.example.test/sign-in?callbackUrl=%2Fuser%2Fappointments"');
  });

  it("escapes anything a customer typed, in HTML and without markup in the text", () => {
    const mail = build("confirmed", { booking: { customerName: '<img src=x onerror="alert(1)">', services: [{ name: "<b>Cut</b>" }] } });
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).not.toContain("<b>Cut</b>");
    expect(mail.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    const withReason = build("cancelled_by_shop", { reason: "<script>x</script>" });
    expect(withReason.html).not.toContain("<script>");
  });

  it("strips control characters and refuses link schemes other than http and https", () => {
    const mail = build("confirmed", { booking: { customerName: "Sam\r\nBcc: evil@example.test" } });
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.text.split("\n").some((line) => line.startsWith("Bcc:"))).toBe(false);
    const unsafe = buildBookingEmail({ event: "confirmed", booking: booking(), shop, baseUrl: "javascript:alert(1)" });
    expect(unsafe.html).not.toContain("javascript:");
    expect(unsafe.html).toContain('href="#"');
  });

  it("calendar attachments: add or update on confirm, reschedule and reminder; remove on cancel; none otherwise", () => {
    for (const event of ["confirmed", "walk_in_confirmed", "rescheduled", "reminder"]) {
      const attachment = build(event).attachment;
      expect(attachment.contentType, event).toContain("method=REQUEST");
      expect(attachment.content, event).toContain("UID:booking-6ae4a05597700686ec5d6e8f@cut.example.test");
      expect(attachment.content, event).toContain("DTSTART;TZID=America/New_York:20261109T100000");
    }
    for (const event of ["cancelled_by_customer", "cancelled_by_shop"]) {
      expect(build(event).attachment.content, event).toContain("METHOD:CANCEL");
      expect(build(event).attachment.content, event).toContain("STATUS:CANCELLED");
    }
    for (const event of ["received", "completed", "no_show", "shop_new_booking", "shop_cancelled_by_customer", "shop_rescheduled"]) expect(build(event).attachment, event).toBeNull();
  });

  it("a reschedule shows the old time as well as the new one", () => {
    const mail = build("rescheduled", { previousStartsAt: "2026-11-02T15:00:00.000Z" });
    expect(mail.text).toContain("When: Monday, November 9, 2026 at 10:00 AM ET");
    expect(mail.text).toContain("Was: Monday, November 2, 2026 at 10:00 AM ET");
  });

  it("a shop cancellation gives the reason, and offers a new booking", () => {
    const mail = build("cancelled_by_shop", { reason: "The barber is ill" });
    expect(mail.text).toContain("Reason: The barber is ill");
    expect(mail.text).toContain("Book again: https://cut.example.test/booking");
    expect(build("cancelled_by_shop").text).not.toContain("Reason:");
  });

  it("emails to the shop name the customer and phone, link to the dashboard and carry no cancellation policy", () => {
    const mail = build("shop_new_booking");
    expect(mail.audience).toBe("shop");
    expect(mail.subject).toMatch(/^New booking: Sam Carter, Monday, November 9, 2026 at 10:00 AM ET \| The Cut Barbershop$/);
    expect(mail.text).toContain("Customer: Sam Carter");
    expect(mail.text).toContain("Phone: +12125550101");
    expect(mail.text).toContain("Open bookings: https://cut.example.test/admin/bookings");
    expect(mail.text).not.toContain(policyText());
  });

  it("the thank-you and the missed-visit mails are polite and have no calendar file", () => {
    expect(build("completed").text).toContain("Thank you for visiting");
    expect(build("no_show").text).toMatch(/we understand/i);
    expect(build("no_show").text).not.toMatch(/fee|charge|penalt/i);
  });

  it("uses the shop's own details and says all times are Eastern", () => {
    expect(build("confirmed").text).toContain("All times are Eastern Time (ET)");
    expect(shopDetails({ name: "X", brand: { main: "X", sub: "Y" }, contact: {}, location: {} })).toMatchObject({ phone: "", address: "" });
  });

  it("rejects an unknown event, and the layout carries a preheader, a viewport and a dark colour scheme", () => {
    expect(() => buildBookingEmail({ event: "nope", booking: booking(), shop, baseUrl })).toThrow();
    const html = build("confirmed").html;
    expect(html).toContain('name="viewport"');
    expect(html).toContain('name="color-scheme" content="dark light"');
    expect(html).toMatch(/display:none[^>]*>Your visit is confirmed: Monday/);
    expect(html).not.toContain("<style");
    expect(bodyFragment(html)).not.toContain("<html");
  });
});
