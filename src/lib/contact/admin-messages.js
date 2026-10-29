import { ObjectId } from "mongodb";
import { MESSAGE_STATUSES, MESSAGE_STATUS_LABELS } from "@/lib/contact/message-status";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Admin side of the contact form: list, read, set status and (Super Admin only) delete. The callers
// authorize first (contactManageAll to read and change status, contactDeleteAll to delete; both are
// held by Admin and Super Admin).

export const MESSAGE_PAGE_SIZE = 25;
export { MESSAGE_STATUSES, MESSAGE_STATUS_LABELS };

const SEARCH_MAX_LENGTH = 60;
const ID_PATTERN = /^[a-f\d]{24}$/i;
const PROJECTION = { name: 1, email: 1, message: 1, status: 1, notificationStatus: 1, autoReplyStatus: 1, createdAt: 1, updatedAt: 1 };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`);
const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

export function parseMessageFilters(params = {}) {
  const rawQ = firstValue(params.q);
  const q = String(typeof rawQ === "string" ? rawQ : "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
  const status = String(firstValue(params.status) ?? "");
  const page = Number.parseInt(String(firstValue(params.page) ?? "1"), 10);
  return {
    q,
    status: MESSAGE_STATUSES.includes(status) ? status : "",
    page: Number.isInteger(page) ? Math.max(1, Math.min(page, 1000)) : 1,
  };
}

export function buildMessageQuery(filters) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.q) {
    const pattern = { $regex: escapeRegex(filters.q), $options: "i" };
    query.$or = [{ name: pattern }, { email: pattern }, { message: pattern }];
  }
  return query;
}

export function messagesQueryString(filters, overrides = {}) {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.status) params.set("status", merged.status);
  if (merged.page > 1) params.set("page", String(merged.page));
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function excerpt(text, length = 120) {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length - 1).trimEnd()}…` : flat;
}

// mailto link for answering from the admin's own mail program. Only the validated address and a fixed subject are used.
export function replyHref(email) {
  return `mailto:${email}?subject=${encodeURIComponent("Re: your message to The Cut Barbershop")}`;
}

function shape(doc) {
  return Object.freeze({
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    message: doc.message,
    status: doc.status,
    notificationStatus: doc.notificationStatus,
    autoReplyStatus: doc.autoReplyStatus,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });
}

export async function listMessages(db, filters) {
  const query = buildMessageQuery(filters);
  const collection = db.collection("contactMessage");
  const [total, docs, unread] = await Promise.all([
    collection.countDocuments(query),
    collection.find(query, { projection: PROJECTION }).sort({ createdAt: -1, _id: -1 }).skip((filters.page - 1) * MESSAGE_PAGE_SIZE).limit(MESSAGE_PAGE_SIZE).toArray(),
    collection.countDocuments({ status: "new" }),
  ]);
  return { messages: docs.map(shape), total, unread, page: filters.page, pageSize: MESSAGE_PAGE_SIZE, pages: Math.max(1, Math.ceil(total / MESSAGE_PAGE_SIZE)) };
}

export async function getMessage(db, id) {
  if (!ID_PATTERN.test(String(id))) return null;
  const doc = await db.collection("contactMessage").findOne({ _id: new ObjectId(id) }, { projection: PROJECTION });
  return doc ? shape(doc) : null;
}

export async function setMessageStatus(db, id, status, actorId, now = new Date()) {
  if (!ID_PATTERN.test(String(id)) || !MESSAGE_STATUSES.includes(status)) return { ok: false, error: "invalid" };
  const result = await db.collection("contactMessage").updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: now } });
  if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
  await appendAuditEvent(db, { actorId, action: "contact.status_changed", targetType: "ContactMessage", targetId: String(id), outcome: "success", details: { status } });
  return { ok: true };
}

export async function deleteMessage(db, id, actorId) {
  if (!ID_PATTERN.test(String(id))) return { ok: false, error: "invalid" };
  const result = await db.collection("contactMessage").deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount !== 1) return { ok: false, error: "not_found" };
  await appendAuditEvent(db, { actorId, action: "contact.deleted", targetType: "ContactMessage", targetId: String(id), outcome: "success" });
  return { ok: true };
}
