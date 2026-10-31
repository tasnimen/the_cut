import { describe, expect, it, vi } from "vitest";
import { mailTestDb } from "./test-db.js";

vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: async (db, event) => db.collection("auditLog").insertOne(event) }));

const { BACKOFF_MINUTES, MAX_ATTEMPTS, backoffAfter, deliverMail, errorCodeOf, hashRecipient, maskEmail } = await import("./delivery.js");

const message = { subject: "Hello", text: "Hi", html: "<p>Hi</p>" };
const NOW = new Date("2026-10-31T12:00:00Z");
const args = (db, transport, extra = {}) => ({ db, transport, from: "shop@example.test", key: "confirmed:b1:customer:1", event: "confirmed", bookingId: "b1", role: "customer", to: "sam@example.com", message, hashSecret: "pepper", now: NOW, ...extra });
const okTransport = () => ({ sendMail: vi.fn(async () => ({})) });
const failingTransport = (error) => ({ sendMail: vi.fn(async () => { throw error; }) });

describe("mail delivery and log", () => {
  it("sends once and records only masked, hashed and coded information", async () => {
    const db = mailTestDb();
    const transport = okTransport();
    expect(await deliverMail(args(db, transport))).toEqual({ status: "sent" });
    expect(transport.sendMail).toHaveBeenCalledTimes(1);
    expect(transport.sendMail.mock.calls[0][0]).toMatchObject({ from: "shop@example.test", to: "sam@example.com", subject: "Hello" });
    const [entry] = db.data.mailLog;
    expect(entry).toMatchObject({ key: "confirmed:b1:customer:1", event: "confirmed", bookingId: "b1", role: "customer", status: "sent", attempts: 1, lastErrorCode: null, recipientMasked: "s***@example.com" });
    expect(JSON.stringify(entry)).not.toContain("sam@example.com");
    expect(entry.recipientHash).toBe(hashRecipient("SAM@example.com ", "pepper"));
    expect(entry.recipientHash).not.toBe(hashRecipient("sam@example.com", "other"));
  });

  it("never sends the same email twice: a repeat, a double click or an overlapping job is skipped", async () => {
    const db = mailTestDb();
    const transport = okTransport();
    await deliverMail(args(db, transport));
    expect(await deliverMail(args(db, transport))).toEqual({ status: "skipped", reason: "already_sent" });
    expect(await deliverMail(args(db, transport, { allowRetry: true }))).toEqual({ status: "skipped", reason: "already_sent" });
    const parallel = mailTestDb();
    const slow = { sendMail: vi.fn(() => new Promise((resolve) => setTimeout(resolve, 20))) };
    const results = await Promise.all([deliverMail(args(parallel, slow)), deliverMail(args(parallel, slow)), deliverMail(args(parallel, slow))]);
    expect(slow.sendMail).toHaveBeenCalledTimes(1);
    expect(results.filter((result) => result.status === "sent")).toHaveLength(1);
    expect(parallel.data.mailLog).toHaveLength(1);
  });

  it("a failure is logged with the error code only, audited, scheduled for a retry, and never thrown", async () => {
    const db = mailTestDb();
    const transport = failingTransport(Object.assign(new Error("550 secret provider text for sam@example.com"), { code: "EENVELOPE" }));
    const result = await deliverMail(args(db, transport));
    expect(result).toEqual({ status: "failed", code: "EENVELOPE" });
    const [entry] = db.data.mailLog;
    expect(entry).toMatchObject({ status: "failed", attempts: 1, lastErrorCode: "EENVELOPE" });
    expect(entry.nextAttemptAt).toEqual(new Date(NOW.getTime() + BACKOFF_MINUTES[0] * 60_000));
    expect(JSON.stringify(db.data.mailLog)).not.toMatch(/secret provider text|sam@example\.com/);
    expect(db.data.auditLog[0]).toMatchObject({ action: "mail.delivery_failed", targetType: "Booking", targetId: "b1", outcome: "failure", details: { event: "confirmed", attempts: "1", code: "EENVELOPE" } });
    expect(JSON.stringify(db.data.auditLog)).not.toMatch(/secret provider text|sam@example\.com/);
  });

  it("does not retry by itself, retries on request after the failure, and then stays sent", async () => {
    const db = mailTestDb();
    await deliverMail(args(db, failingTransport(Object.assign(new Error("x"), { code: "ETIMEDOUT" }))));
    const transport = okTransport();
    expect(await deliverMail(args(db, transport))).toEqual({ status: "skipped", reason: "failed" });
    expect(transport.sendMail).not.toHaveBeenCalled();
    expect(await deliverMail(args(db, transport, { allowRetry: true, now: new Date(NOW.getTime() + 6 * 60_000) }))).toEqual({ status: "sent" });
    expect(db.data.mailLog[0]).toMatchObject({ status: "sent", attempts: 2, lastErrorCode: null, nextAttemptAt: null });
    expect(await deliverMail(args(db, transport, { allowRetry: true }))).toEqual({ status: "skipped", reason: "already_sent" });
    expect(transport.sendMail).toHaveBeenCalledTimes(1);
  });

  it("backs off 5 minutes, 30 minutes and 2 hours, then stops after four attempts", async () => {
    const db = mailTestDb();
    const transport = failingTransport(Object.assign(new Error("x"), { code: "ECONNECTION" }));
    const waits = [];
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      await deliverMail(args(db, transport, { allowRetry: true, now: new Date(NOW.getTime() + attempt * 3 * 3_600_000) }));
      const entry = db.data.mailLog[0];
      waits.push(entry.nextAttemptAt ? (entry.nextAttemptAt - entry.updatedAt) / 60_000 : null);
    }
    expect(waits).toEqual([5, 30, 120, null]);
    expect(db.data.mailLog[0].attempts).toBe(MAX_ATTEMPTS);
    const result = await deliverMail(args(db, transport, { allowRetry: true, now: new Date(NOW.getTime() + 99 * 3_600_000) }));
    expect(result).toMatchObject({ status: "failed", reason: "max_attempts" });
    expect(transport.sendMail).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(backoffAfter(MAX_ATTEMPTS, NOW)).toBeNull();
  });

  it("refuses a bad recipient without calling the provider", async () => {
    for (const to of ["not-an-email", "a@b.co\r\nBcc: evil@example.test", "<a@b.co>", ""]) {
      const db = mailTestDb();
      const transport = okTransport();
      expect(await deliverMail(args(db, transport, { to }))).toEqual({ status: "failed", code: "invalid_recipient" });
      expect(transport.sendMail).not.toHaveBeenCalled();
    }
  });

  it("passes the reply address and the calendar attachment to the provider only when valid", async () => {
    const transport = okTransport();
    await deliverMail(args(mailTestDb(), transport, { message: { ...message, replyTo: "customer@example.com", attachment: { filename: "a.ics", content: "x", contentType: "text/calendar" } } }));
    expect(transport.sendMail.mock.calls[0][0]).toMatchObject({ replyTo: "customer@example.com", attachments: [{ filename: "a.ics" }] });
    const bad = okTransport();
    await deliverMail(args(mailTestDb(), bad, { message: { ...message, replyTo: "x\r\nBcc: y@z.co" } }));
    expect(bad.sendMail.mock.calls[0][0]).not.toHaveProperty("replyTo");
  });

  it("takes over an email left half-sent for more than ten minutes, but not a fresh one", async () => {
    const db = mailTestDb({ mailLog: [{ key: "confirmed:b1:customer:1", status: "queued", attempts: 0, updatedAt: new Date(NOW.getTime() - 60_000), bookingId: "b1", event: "confirmed" }] });
    const transport = okTransport();
    expect(await deliverMail(args(db, transport, { allowRetry: true }))).toEqual({ status: "skipped", reason: "in_progress" });
    db.data.mailLog[0].updatedAt = new Date(NOW.getTime() - 11 * 60_000);
    expect(await deliverMail(args(db, transport, { allowRetry: true }))).toEqual({ status: "sent" });
  });

  it("small helpers behave", () => {
    expect(maskEmail(" Sam.Carter@Example.COM ")).toBe("s***@example.com");
    expect(errorCodeOf({ code: "EAUTH" })).toBe("EAUTH");
    expect(errorCodeOf({ responseCode: 550 })).toBe("550");
    expect(errorCodeOf({ code: "bad code!\n<script>" })).toBe("badcodescript");
    expect(errorCodeOf(null)).toBe("error");
  });
});
