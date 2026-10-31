import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mailTestDb } from "./test-db.js";

const mocks = vi.hoisted(() => ({ transport: { sendMail: null } }));
vi.mock("@/config/env", () => ({ env: { NODE_ENV: "test", MAIL_TO: "shop@example.test", BETTER_AUTH_SECRET: "pepper", BETTER_AUTH_URL: "https://cut.example.test" } }));
vi.mock("@/lib/catalog/source", () => ({ getSiteSettings: async () => ({ name: "The Cut Barbershop", brand: { main: "THE CUT", sub: "BARBERSHOP" }, contact: { phone: "+1 212 555 0100", email: "" }, location: { streetAddress: "1 Main St", city: "New York", region: "NY", postalCode: "10001" } }) }));
vi.mock("@/lib/mail/mailer", () => ({ getMailTransport: () => mocks.transport, getMailFrom: () => "The Cut <no-reply@example.test>" }));
vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: async (db, event) => db.collection("auditLog").insertOne(event) }));

const { OPERATION_EVENTS, idempotencyKey, isStillRelevant, resendMail, retryDueMail, sendBookingMails, sendReminderMail } = await import("./booking-mail.js");

const BOOKING_ID = new ObjectId();
const record = (extra = {}) => ({
  _id: BOOKING_ID, userId: "cust-1", customerName: "Sam Carter", phoneE164: "+12125550101", status: "confirmed",
  services: [{ name: "Haircut" }], barberId: "b1", barberName: "Daniel Carter", startsAt: new Date("2026-11-09T15:00:00Z"), endsAt: new Date("2026-11-09T15:30:00Z"),
  durationMinutes: 30, totalPriceMinorUnits: 10000, currency: "USD", updatedAt: new Date("2026-10-31T12:00:00Z"), ...extra,
});
const publicBooking = (extra = {}) => ({ id: String(BOOKING_ID), customerName: "Sam Carter", phone: "+12125550101", status: "confirmed", services: [{ name: "Haircut" }], barber: { id: "b1", name: "Daniel Carter" }, startsAt: "2026-11-09T15:00:00.000Z", endsAt: "2026-11-09T15:30:00.000Z", durationMinutes: 30, totalPriceMinorUnits: 10000, currency: "USD", ...extra });
const world = (extra = {}) => mailTestDb({ user: [{ id: "cust-1", email: "sam@example.com" }], booking: [record()], ...extra });

let sent;
beforeEach(() => {
  sent = [];
  mocks.transport.sendMail = vi.fn(async (message) => { sent.push(message); });
});

describe("which emails each booking operation sends", () => {
  it("a new confirmed booking: the customer is confirmed and the shop is told, with the customer as reply address", async () => {
    const db = world();
    const results = await sendBookingMails({ db, operation: "created", booking: publicBooking(), customerUserId: "cust-1" });
    expect(results.map((result) => [result.event, result.status])).toEqual([["confirmed", "sent"], ["shop_new_booking", "sent"]]);
    const [customer, shop] = sent;
    expect(customer).toMatchObject({ to: "sam@example.com", from: "The Cut <no-reply@example.test>" });
    expect(customer.subject).toContain("confirmed");
    expect(customer.attachments[0].contentType).toContain("method=REQUEST");
    expect(shop).toMatchObject({ to: "shop@example.test", replyTo: "sam@example.com" });
    expect(shop.subject).toContain("New booking: Sam Carter");
    expect(shop).not.toHaveProperty("attachments");
  });

  it("a pending booking is acknowledged as received", async () => {
    const results = await sendBookingMails({ db: world(), operation: "created", booking: publicBooking({ status: "pending" }), customerUserId: "cust-1" });
    expect(results[0].event).toBe("received");
  });

  it("every operation maps to the right events and recipients", async () => {
    const expected = { walk_in: ["walk_in_confirmed"], confirmed: ["confirmed"], reschedule: ["rescheduled", "shop_rescheduled"], cancel_by_customer: ["cancelled_by_customer", "shop_cancelled_by_customer"], cancel_by_shop: ["cancelled_by_shop"], completed: ["completed"], no_show: ["no_show"] };
    for (const [operation, events] of Object.entries(expected)) expect(OPERATION_EVENTS[operation](publicBooking()), operation).toEqual(events);
    const db = world();
    const cancelled = await sendBookingMails({ db, operation: "cancel_by_shop", booking: publicBooking({ status: "cancelled" }), customerUserId: "cust-1", reason: "Barber is ill" });
    expect(cancelled).toHaveLength(1);
    expect(sent[0].to).toBe("sam@example.com");
    expect(sent[0].text).toContain("Reason: Barber is ill");
    expect(sent[0].attachments[0].content).toContain("METHOD:CANCEL");
  });

  it("a customer cancellation gives the customer a receipt and tells the shop", async () => {
    await sendBookingMails({ db: world(), operation: "cancel_by_customer", booking: publicBooking({ status: "cancelled" }), customerUserId: "cust-1" });
    expect(sent.map((message) => message.to)).toEqual(["sam@example.com", "shop@example.test"]);
  });

  it("completed and missed visits email only the customer", async () => {
    await sendBookingMails({ db: world(), operation: "completed", booking: publicBooking({ status: "completed" }), customerUserId: "cust-1" });
    await sendBookingMails({ db: world(), operation: "no_show", booking: publicBooking({ status: "no_show" }), customerUserId: "cust-1" });
    expect(sent.map((message) => message.to)).toEqual(["sam@example.com", "sam@example.com"]);
  });

  it("a walk-in is emailed only when an address was entered, and the address is never taken from the account list", async () => {
    const walkInId = `walkin:${BOOKING_ID}`;
    const without = world({ booking: [record({ userId: walkInId })] });
    expect((await sendBookingMails({ db: without, operation: "walk_in", booking: publicBooking(), customerUserId: walkInId }))[0]).toMatchObject({ status: "skipped", reason: "no_recipient" });
    expect(sent).toHaveLength(0);
    const withEmail = world({ booking: [record({ userId: walkInId, customerEmail: "walkin@example.com" })] });
    expect((await sendBookingMails({ db: withEmail, operation: "walk_in", booking: publicBooking(), customerUserId: walkInId }))[0].status).toBe("sent");
    expect(sent[0].to).toBe("walkin@example.com");
  });

  it("a customer with no email address on file is skipped quietly", async () => {
    const results = await sendBookingMails({ db: world({ user: [{ id: "cust-1" }] }), operation: "confirmed", booking: publicBooking(), customerUserId: "cust-1" });
    expect(results[0]).toMatchObject({ status: "skipped", reason: "no_recipient" });
  });
});

describe("safety: no double sends, no broken bookings", () => {
  it("the same change sent twice (a retry or a double click) emails once", async () => {
    const db = world();
    await sendBookingMails({ db, operation: "created", booking: publicBooking(), customerUserId: "cust-1" });
    const again = await sendBookingMails({ db, operation: "created", booking: publicBooking(), customerUserId: "cust-1" });
    expect(sent).toHaveLength(2);
    expect(again.every((result) => result.status === "skipped")).toBe(true);
    expect(db.data.mailLog).toHaveLength(2);
  });

  it("a reschedule to a new time is a new email, a repeat of the same one is not", async () => {
    const db = world();
    const first = publicBooking({ previousStartsAt: "2026-11-02T15:00:00.000Z" });
    await sendBookingMails({ db, operation: "reschedule", booking: first, customerUserId: "cust-1" });
    await sendBookingMails({ db, operation: "reschedule", booking: first, customerUserId: "cust-1" });
    expect(sent).toHaveLength(2);
    expect(sent[0].text).toContain("Was: Monday, November 2, 2026 at 10:00 AM ET");
    await sendBookingMails({ db, operation: "reschedule", booking: publicBooking({ startsAt: "2026-11-10T16:00:00.000Z", endsAt: "2026-11-10T16:30:00.000Z", previousStartsAt: first.startsAt }), customerUserId: "cust-1" });
    expect(sent).toHaveLength(4);
    expect(idempotencyKey({ event: "rescheduled", bookingId: "b", role: "customer", startsAt: "2026-11-09T15:00:00Z" })).not.toBe(idempotencyKey({ event: "rescheduled", bookingId: "b", role: "customer", startsAt: "2026-11-10T15:00:00Z" }));
    expect(idempotencyKey({ event: "confirmed", bookingId: "b", role: "customer", startsAt: "2026-11-09T15:00:00Z" })).toBe("confirmed:b:customer:1");
  });

  it("a provider failure never throws, leaves the other email alone, and is logged and audited", async () => {
    mocks.transport.sendMail = vi.fn(async (message) => { if (message.to === "sam@example.com") throw Object.assign(new Error("550 no"), { code: "EENVELOPE" }); sent.push(message); });
    const db = world();
    const results = await sendBookingMails({ db, operation: "created", booking: publicBooking(), customerUserId: "cust-1" });
    expect(results.map((result) => result.status)).toEqual(["failed", "sent"]);
    expect(db.data.mailLog.find((entry) => entry.role === "customer")).toMatchObject({ status: "failed", lastErrorCode: "EENVELOPE" });
    expect(db.data.auditLog).toHaveLength(1);
  });

  it("a missing mail setup or a database error does not throw either", async () => {
    mocks.transport.sendMail = vi.fn(async () => { throw new Error("down"); });
    const broken = { collection: () => { throw new Error("db down"); } };
    await expect(sendBookingMails({ db: broken, operation: "created", booking: publicBooking(), customerUserId: "cust-1" })).resolves.toBeTruthy();
  });
});

describe("retry job and Resend", () => {
  const failedEntry = (extra = {}) => ({ _id: new ObjectId(), key: `confirmed:${BOOKING_ID}:customer:1`, event: "confirmed", bookingId: String(BOOKING_ID), role: "customer", status: "failed", attempts: 1, lastErrorCode: "ETIMEDOUT", nextAttemptAt: new Date("2026-10-31T11:00:00Z"), updatedAt: new Date("2026-10-31T10:55:00Z"), context: { customerUserId: "cust-1" }, ...extra });
  const NOW = new Date("2026-10-31T12:00:00Z");

  it("retries due failed emails, rebuilt from the booking, and leaves the rest", async () => {
    const notDue = failedEntry({ key: "x:1", nextAttemptAt: new Date("2026-10-31T13:00:00Z") });
    const exhausted = failedEntry({ key: "x:2", attempts: 4 });
    const db = world({ mailLog: [failedEntry(), notDue, exhausted] });
    expect(await retryDueMail({ db, now: NOW })).toEqual({ sent: 1, failed: 0, skipped: 0 });
    expect(sent).toHaveLength(1);
    expect(db.data.mailLog[0]).toMatchObject({ status: "sent", attempts: 2 });
    expect(db.data.mailLog[1].status).toBe("failed");
    expect(db.data.mailLog[2].attempts).toBe(4);
  });

  it("skips a retry that no longer makes sense (the booking was cancelled meanwhile) instead of sending it", async () => {
    const db = world({ booking: [record({ status: "cancelled" })], mailLog: [failedEntry()] });
    expect(await retryDueMail({ db, now: NOW })).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(sent).toHaveLength(0);
    expect(db.data.mailLog[0].status).toBe("skipped");
    expect(isStillRelevant("confirmed", "cancelled")).toBe(false);
    expect(isStillRelevant("cancelled_by_shop", "cancelled")).toBe(true);
  });

  it("a retry that fails again waits longer", async () => {
    mocks.transport.sendMail = vi.fn(async () => { throw Object.assign(new Error("x"), { code: "ETIMEDOUT" }); });
    const db = world({ mailLog: [failedEntry()] });
    expect(await retryDueMail({ db, now: NOW })).toEqual({ sent: 0, failed: 1, skipped: 0 });
    expect(db.data.mailLog[0]).toMatchObject({ status: "failed", attempts: 2 });
    expect(db.data.mailLog[0].nextAttemptAt - NOW).toBe(30 * 60_000);
  });

  it("Resend sends a failed email once, even after the automatic attempts are used, and refuses everything else", async () => {
    const entry = failedEntry({ attempts: 4, nextAttemptAt: null });
    const db = world({ mailLog: [entry] });
    expect(await resendMail({ db, id: String(entry._id), now: NOW })).toMatchObject({ ok: true, status: "sent" });
    expect(sent).toHaveLength(1);
    expect(await resendMail({ db, id: String(entry._id), now: NOW })).toEqual({ ok: false, error: "not_failed" });
    expect(sent).toHaveLength(1);
    expect(await resendMail({ db, id: String(new ObjectId()), now: NOW })).toEqual({ ok: false, error: "not_found" });
    expect(await resendMail({ db, id: "not-an-id", now: NOW })).toEqual({ ok: false, error: "not_found" });
  });
});

describe("reminder email", () => {
  const reminder = { to: "sam@example.com", name: "Sam Carter", booking: { ...publicBooking(), userId: "cust-1" } };

  it("is sent once and a repeat call counts as already done", async () => {
    const db = world();
    await sendReminderMail({ db, ...reminder });
    await expect(sendReminderMail({ db, ...reminder })).resolves.toBeUndefined();
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("Reminder");
    expect(sent[0].text).toContain("Monday, November 9, 2026 at 10:00 AM ET");
  });

  it("throws when it could not be sent, so the job tries again", async () => {
    mocks.transport.sendMail = vi.fn(async () => { throw new Error("down"); });
    await expect(sendReminderMail({ db: world(), ...reminder })).rejects.toThrow("reminder_not_sent");
  });
});
