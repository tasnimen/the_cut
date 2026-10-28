import { describe, expect, it } from "vitest";
import { createContactFormTicket, readContactFormData, validateContactTicket } from "./contact-core.js";
import { createContactMessageRecord } from "./contact-message-model.js";

const secret = "test-only-secret-that-is-long-enough-for-hmac";

function formData({ name = "Sam", email = "sam@example.test", message = "I have a question about an appointment.", website = "", formTicket, captchaToken = "" } = {}) {
  const form = new FormData();
  form.set("name", name);
  form.set("email", email);
  form.set("message", message);
  form.set("website", website);
  form.set("formTicket", formTicket || createContactFormTicket({ secret, now: Date.now() - 5000 }));
  form.set("captchaToken", captchaToken);
  return form;
}

describe("contact form guardrails", () => {
  it("accepts bounded fields and rejects header-injection email input", () => {
    expect(readContactFormData(formData()).success).toBe(true);
    expect(readContactFormData(formData({ email: "sam@example.test\r\nBcc:other@example.test" })).success).toBe(false);
  });

  it("signs a server-issued fill-time ticket and rejects replay-window or tampering", () => {
    const now = Date.now();
    const ticket = createContactFormTicket({ secret, now: now - 4000 });
    expect(validateContactTicket({ ticket, secret, now })).toBe(true);
    expect(validateContactTicket({ ticket: `${ticket}x`, secret, now })).toBe(false);
    expect(validateContactTicket({ ticket: createContactFormTicket({ secret, now }), secret, now })).toBe(false);
    expect(validateContactTicket({ ticket, secret, now: now + 3 * 60 * 60 * 1000 })).toBe(false);
  });

  it("persists messages with the initial status and independent delivery states", () => {
    const record = createContactMessageRecord({
      name: "Sam",
      email: "sam@example.test",
      message: "I have a question about an appointment.",
      now: new Date("2026-10-28T00:00:00.000Z"),
    });
    expect(record).toMatchObject({ status: "new", notificationStatus: "queued", autoReplyStatus: "queued" });
  });
});
