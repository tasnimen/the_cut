import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { buildMessageQuery, deleteMessage, excerpt, getMessage, listMessages, messagesQueryString, parseMessageFilters, replyHref, setMessageStatus } from "@/lib/contact/admin-messages";

function fakeDb(docs = []) {
  const audit = [];
  const calls = {};
  const cursor = (rows) => ({ sort: () => cursor(rows), skip: () => cursor(rows), limit: () => cursor(rows), toArray: async () => rows });
  const db = { collection: (name) => {
    if (name === "auditLog") return { insertOne: async (event) => { audit.push(event); } };
    return {
      countDocuments: async (query) => (query.status === "new" ? docs.filter((d) => d.status === "new").length : docs.length),
      find: (query, options) => { calls.query = query; calls.projection = options.projection; return cursor(docs); },
      findOne: async (query) => docs.find((d) => String(d._id) === String(query._id)) ?? null,
      updateOne: async (query, update) => { const doc = docs.find((d) => String(d._id) === String(query._id)); if (!doc) return { matchedCount: 0 }; Object.assign(doc, update.$set); return { matchedCount: 1 }; },
      deleteOne: async (query) => { const index = docs.findIndex((d) => String(d._id) === String(query._id)); if (index < 0) return { deletedCount: 0 }; docs.splice(index, 1); return { deletedCount: 1 }; },
    };
  } };
  return { db, audit, calls, docs };
}

const doc = (overrides = {}) => ({ _id: new ObjectId(), name: "Sam", email: "sam@example.com", message: "Hello there, do you do kids cuts?", status: "new", notificationStatus: "sent", autoReplyStatus: "sent", createdAt: new Date("2026-10-29T10:00:00Z"), updatedAt: new Date("2026-10-29T10:00:00Z"), ...overrides });

describe("filters and queries", () => {
  it("accepts known statuses only, cleans the search and bounds the page", () => {
    expect(parseMessageFilters({ q: " hi\u0000 ", status: "replied", page: "2" })).toEqual({ q: "hi", status: "replied", page: 2 });
    expect(parseMessageFilters({ q: { $ne: "" }, status: "deleted", page: "-3" })).toEqual({ q: "", status: "", page: 1 });
    expect(parseMessageFilters({ q: "x".repeat(300), page: "99999" })).toMatchObject({ page: 1000 });
  });
  it("escapes the search and searches name, email and message", () => {
    const query = buildMessageQuery({ q: "a.b(", status: "new", page: 1 });
    expect(query.status).toBe("new");
    expect(query.$or).toHaveLength(3);
    expect(query.$or[2].message.$regex).toBe("a\\.b\\(");
    expect(buildMessageQuery({ q: "", status: "", page: 1 })).toEqual({});
  });
  it("builds query strings without empty values", () => {
    expect(messagesQueryString({ q: "", status: "new", page: 1 }, { page: 2 })).toBe("?status=new&page=2");
  });
});

describe("helpers", () => {
  it("shortens long text onto one line", () => {
    expect(excerpt("a\n\n b   c")).toBe("a b c");
    expect(excerpt("x".repeat(200), 20)).toHaveLength(20);
  });
  it("builds a mailto reply link with a fixed encoded subject", () => {
    expect(replyHref("sam@example.com")).toBe("mailto:sam@example.com?subject=Re%3A%20your%20message%20to%20The%20Cut%20Barbershop");
  });
});

describe("listMessages / getMessage", () => {
  it("lists messages with counts and no internal fields", async () => {
    const { db, calls } = fakeDb([doc(), doc({ status: "read" })]);
    const result = await listMessages(db, { q: "", status: "", page: 1 });
    expect(result).toMatchObject({ total: 2, unread: 1, pages: 1 });
    expect(Object.keys(calls.projection).sort()).toEqual(["autoReplyStatus", "createdAt", "email", "message", "name", "notificationStatus", "status", "updatedAt"]);
    expect(result.messages[0].id).toMatch(/^[a-f\d]{24}$/);
  });
  it("finds one message by a valid id only", async () => {
    const message = doc();
    const { db } = fakeDb([message]);
    expect((await getMessage(db, String(message._id))).name).toBe("Sam");
    expect(await getMessage(db, "not-an-id")).toBeNull();
    expect(await getMessage(db, String(new ObjectId()))).toBeNull();
  });
});

describe("setMessageStatus / deleteMessage", () => {
  it("changes the status and audits it without the message text", async () => {
    const message = doc();
    const { db, audit } = fakeDb([message]);
    expect(await setMessageStatus(db, String(message._id), "replied", "admin-1", new Date("2026-10-30T09:00:00Z"))).toEqual({ ok: true });
    expect(message.status).toBe("replied");
    expect(audit[0]).toMatchObject({ actorId: "admin-1", action: "contact.status_changed", targetType: "ContactMessage", details: { status: "replied" } });
    expect(JSON.stringify(audit)).not.toMatch(/kids cuts|sam@example/);
  });
  it("refuses bad ids, bad statuses and missing messages", async () => {
    const { db, audit } = fakeDb([]);
    expect((await setMessageStatus(db, "x", "read", "a")).error).toBe("invalid");
    expect((await setMessageStatus(db, String(new ObjectId()), "bogus", "a")).error).toBe("invalid");
    expect((await setMessageStatus(db, String(new ObjectId()), "read", "a")).error).toBe("not_found");
    expect(audit).toHaveLength(0);
  });
  it("deletes one message and audits it", async () => {
    const keep = doc();
    const gone = doc();
    const { db, audit, docs } = fakeDb([keep, gone]);
    expect(await deleteMessage(db, String(gone._id), "super-1")).toEqual({ ok: true });
    expect(docs).toEqual([keep]);
    expect(audit[0]).toMatchObject({ actorId: "super-1", action: "contact.deleted" });
    expect((await deleteMessage(db, String(gone._id), "super-1")).error).toBe("not_found");
    expect((await deleteMessage(db, "bad", "super-1")).error).toBe("invalid");
  });
});

vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: async (db, event) => db.collection("auditLog").insertOne(event) }));
