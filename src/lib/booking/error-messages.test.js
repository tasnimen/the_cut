import { describe, expect, it } from "vitest";
import { TOAST_MESSAGES } from "@/lib/toast/messages";
import { bookingFailureMessage, bookingFailureToast } from "./error-messages.js";

describe("booking failure messages", () => {
  it("says why for the refusals that retrying cannot fix", () => {
    expect(bookingFailureMessage("active_booking_limit", 409, 2)).toMatch(/already have 2 upcoming appointments.*Cancel or move one/);
    expect(bookingFailureMessage("rate_limited", 429)).toMatch(/wait a while/);
    expect(bookingFailureMessage("invalid_phone", 400)).toMatch(/valid US phone/);
    expect(bookingFailureMessage("phone_required_for_sms_consent", 400)).toMatch(/phone number/);
    expect(bookingFailureMessage("service_unavailable", 409)).toMatch(/no longer available/);
    expect(bookingFailureMessage("slot_just_taken", 409)).toMatch(/just taken/);
  });

  it("uses the configured booking cap by default", () => {
    expect(bookingFailureMessage("active_booking_limit", 409)).toMatch(/already have \d+ upcoming/);
  });

  it("keeps unknown codes generic and never repeats server text", () => {
    expect(bookingFailureMessage("something_odd", 400)).toMatch(/could not be completed/);
    expect(bookingFailureMessage("something_odd", 500)).toMatch(/our side/);
    expect(bookingFailureMessage("<script>alert(1)</script>", 400)).not.toMatch(/script/);
    expect(bookingFailureMessage(undefined, undefined)).toMatch(/could not be completed/);
  });

  it("picks a toast that exists", () => {
    for (const [code, status] of [["slot_just_taken", 409], ["active_booking_limit", 409], ["rate_limited", 429], ["x", 400], ["x", 500]]) {
      expect(TOAST_MESSAGES[bookingFailureToast(code, status)], `${code} ${status}`).toBeTruthy();
    }
    expect(bookingFailureToast("active_booking_limit", 409)).toBe("bookingLimit");
    expect(bookingFailureToast("rate_limited", 429)).toBe("rateLimited");
  });
});
