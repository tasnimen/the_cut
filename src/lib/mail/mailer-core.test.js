import { describe, expect, it, vi } from "vitest";
import { createAuthMailer, createContactMailer, scheduleMailDelivery } from "./mailer-core.js";
import { scheduleContactDelivery } from "../contact/contact-core.js";

describe("server auth mail behavior", () => {
  it("uses a mock transport and escapes user-controlled verification content", async () => {
    const sent = [];
    const mailer = createAuthMailer({
      transport: { sendMail: async (message) => sent.push(message) },
      from: "noreply@example.test",
      alertTo: "security@example.test",
      allowedOrigin: "https://cut.example.test",
    });

    await mailer.sendVerificationEmail({
      to: "customer@example.test",
      name: '<img src=x onerror="alert(1)"> &',
      url: "https://cut.example.test/api/auth/verify-email?token=abc&callbackURL=%2Fsign-in",
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp;");
    expect(sent[0].html).toContain("token=abc&amp;callbackURL=");
    expect(sent[0].html).not.toContain('<img src=x');
  });

  it("records delivery failure without passing SMTP errors to audit code", async () => {
    let scheduled;
    const auditRows = [];
    const smtpError = "SMTP_PASS=mock-secret host=private-mail.internal";
    const onFailure = vi.fn(async () => {
      auditRows.push({ action: "auth.email_verification.delivery_failed", outcome: "failure" });
    });

    scheduleMailDelivery({
      schedule: (task) => { scheduled = task; },
      send: async () => { throw new Error(smtpError); },
      onFailure,
    });
    await scheduled();

    expect(onFailure).toHaveBeenCalledOnce();
    expect(onFailure).toHaveBeenCalledWith();
    expect(auditRows).toEqual([{ action: "auth.email_verification.delivery_failed", outcome: "failure" }]);
    expect(JSON.stringify(auditRows)).not.toContain("mock-secret");
  });

  it("sends escaped notification and branded plain-text auto-reply through a mock transport", async () => {
    const sent = [];
    const mailer = createContactMailer({
      transport: { sendMail: async (message) => sent.push(message) },
      from: "hello@example.test",
      alertTo: "shop@example.test",
    });
    const input = { name: '<script>alert("x")</script>', email: "customer@example.test", message: "Hello <b>team</b>\nThanks" };
    await mailer.sendNotification(input);
    await mailer.sendAutoReply(input);

    expect(sent).toHaveLength(2);
    expect(sent[0].to).toBe("shop@example.test");
    expect(sent[0].replyTo).toBe(input.email);
    expect(sent[0].html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(sent[0].html).not.toContain("<script>");
    expect(sent[0].text).toContain("Hello <b>team</b>");
    expect(sent[1].to).toBe(input.email);
    expect(sent[1].text).toContain("Thanks for contacting The Cut Barbershop");
    expect(sent.every(({ text, html }) => text && html)).toBe(true);
  });

  it("rejects CRLF mail header injection", async () => {
    const mailer = createContactMailer({
      transport: { sendMail: vi.fn() },
      from: "hello@example.test",
      alertTo: "shop@example.test",
    });
    await expect(mailer.sendNotification({
      name: "Customer",
      email: "customer@example.test\r\nBcc:attacker@example.test",
      message: "Hello, I have a question.",
    })).rejects.toThrow("Invalid mail address");
  });

  it("accepts a safe display-name sender address", async () => {
    const sent = [];
    const mailer = createAuthMailer({
      transport: { sendMail: async (message) => sent.push(message) },
      from: "The Cut <hello@example.test>",
      alertTo: "security@example.test",
      allowedOrigin: "https://cut.example.test",
    });
    await mailer.sendVerificationEmail({
      to: "customer@example.test",
      url: "https://cut.example.test/verify?token=test",
      testMode: true,
    });
    expect(sent[0].from).toBe("The Cut <hello@example.test>");
    expect(sent[0].subject).toMatch(/^\[TEST\]/);
    expect(sent[0].text).toContain("TEST ONLY");
  });

  it("keeps contact records independently of mock email delivery failures", async () => {
    let scheduled;
    const statuses = [];
    const smtpError = "host=mail.private.test password=secret";
    const notification = vi.fn(async () => { throw new Error(smtpError); });
    const autoReply = vi.fn(async () => {});
    scheduleContactDelivery({
      schedule: (task) => { scheduled = task; },
      notification,
      autoReply,
      updateStatus: async (kind, status) => statuses.push({ kind, status }),
    });
    await scheduled();

    expect(notification).toHaveBeenCalledOnce();
    expect(autoReply).toHaveBeenCalledOnce();
    expect(statuses).toEqual([
      { kind: "notification", status: "failed" },
      { kind: "autoReply", status: "sent" },
    ]);
    expect(JSON.stringify(statuses)).not.toContain("private.test");
    expect(JSON.stringify(statuses)).not.toContain("secret");
  });

  it("persists the new contact message before queueing both mail jobs", async () => {
    const events = [];
    let scheduled;
    const record = { status: "new" };
    events.push("insert");
    expect(record.status).toBe("new");
    scheduleContactDelivery({
      schedule: (task) => { events.push("schedule"); scheduled = task; },
      notification: async () => { events.push("notification"); throw new Error("provider rejected"); },
      autoReply: async () => { events.push("auto-reply"); throw new Error("provider rejected"); },
      updateStatus: async () => {},
    });
    expect(events).toEqual(["insert", "schedule"]);
    await scheduled();
    expect(events.slice(0, 2)).toEqual(["insert", "schedule"]);
    expect(events).toContain("notification");
    expect(events).toContain("auto-reply");
  });
});
