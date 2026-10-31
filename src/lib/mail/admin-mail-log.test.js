import { describe, expect, it } from "vitest";
import { listMailLog, MAIL_EVENT_LABELS, parseMailFilters } from "./admin-mail-log.js";
import { BOOKING_EVENTS } from "./templates/booking.js";

const entry = (extra = {}) => ({ _id: "6ae4a05597700686ec5d6e8f", key: "confirmed:b1:customer:1", event: "confirmed", bookingId: "b1", role: "customer", recipientMasked: "s***@example.com", recipientHash: "abc123secrethash", status: "failed", attempts: 2, lastErrorCode: "ETIMEDOUT", nextAttemptAt: new Date("2026-10-31T12:30:00Z"), createdAt: new Date("2026-10-31T12:00:00Z"), context: { customerUserId: "u1", reason: "private" }, ...extra });
const fakeDb = (rows) => ({ collection: () => ({
  countDocuments: async (query) => rows.filter((row) => !query.status || row.status === query.status).length,
  find: (query) => { let result = rows.filter((row) => !query.status || row.status === query.status); const cursor = { sort: () => cursor, skip: (count) => { result = result.slice(count); return cursor; }, limit: (count) => { result = result.slice(0, count); return cursor; }, toArray: async () => result }; return cursor; },
}) });

describe("email log reader", () => {
  it("returns only safe fields: no key, no address hash, no context, no booking id", async () => {
    const result = await listMailLog(fakeDb([entry()]), parseMailFilters({}));
    expect(result.entries[0]).toEqual({ id: "6ae4a05597700686ec5d6e8f", event: "confirmed", label: "Booking confirmed", role: "Customer", recipient: "s***@example.com", status: "failed", attempts: 2, errorCode: "ETIMEDOUT", createdAt: "2026-10-31T12:00:00.000Z", nextAttemptAt: "2026-10-31T12:30:00.000Z" });
    expect(JSON.stringify(result)).not.toMatch(/secrethash|customerUserId|private|confirmed:b1/);
  });

  it("counts failed emails and filters by status", async () => {
    const rows = [entry(), entry({ _id: "a".repeat(24), status: "sent", key: "k2" }), entry({ _id: "b".repeat(24), status: "failed", key: "k3" })];
    const all = await listMailLog(fakeDb(rows), parseMailFilters({}));
    expect(all).toMatchObject({ total: 3, failed: 2 });
    expect((await listMailLog(fakeDb(rows), parseMailFilters({ status: "sent" }))).entries).toHaveLength(1);
  });

  it("accepts only known statuses and sensible page numbers", () => {
    expect(parseMailFilters({ status: "failed", page: "3" })).toEqual({ status: "failed", page: 3 });
    for (const bad of [{ status: "{\"$ne\":1}", page: "0" }, { status: ["failed"], page: "-1" }, { status: "x", page: "abc" }, { page: "99999" }, undefined]) {
      expect(parseMailFilters(bad)).toEqual({ status: "", page: 1 });
    }
  });

  it("has a readable label for every booking email event", () => {
    for (const event of Object.keys(BOOKING_EVENTS)) expect(MAIL_EVENT_LABELS[event], event).toBeTruthy();
  });
});
