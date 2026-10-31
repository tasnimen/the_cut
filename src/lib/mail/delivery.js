import { createHmac } from "node:crypto";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Safe mail delivery with a log. Every email has one idempotency key (event, booking, recipient, version), so a retry,
// a double click or two overlapping jobs can never send the same email twice. The log keeps only: the event, the
// booking id, a masked address and a keyed hash of the address, the status, the number of attempts, an error CODE
// (never the provider's message) and timestamps. A failure is logged and audited and returned; it never throws, so the
// booking that caused the email is never blocked or rolled back.

export const MAIL_LOG = "mailLog";
export const MAX_ATTEMPTS = 4;
export const BACKOFF_MINUTES = Object.freeze([5, 30, 120]);
const STALE_QUEUED_MS = 10 * 60_000;

export function maskEmail(email) {
  const [local = "", domain = ""] = String(email).trim().toLowerCase().split("@");
  return `${local.slice(0, 1)}***@${domain}`.slice(0, 120);
}

export const hashRecipient = (email, secret = "") => createHmac("sha256", String(secret)).update(String(email).trim().toLowerCase()).digest("hex");

export function errorCodeOf(error) {
  const raw = error?.code ?? error?.responseCode ?? error?.name ?? "error";
  return String(raw).replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 40) || "error";
}

export const backoffAfter = (attempts, now) => (attempts >= MAX_ATTEMPTS ? null : new Date(now.getTime() + BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length) - 1] * 60_000));

const validAddress = (value) => typeof value === "string" && value.length <= 320 && !/[\r\n<>]/.test(value) && /^\S+@\S+\.\S+$/.test(value);

async function attempt({ db, transport, from, doc, to, message, now }) {
  const log = db.collection(MAIL_LOG);
  const attempts = (doc.attempts ?? 0) + 1;
  try {
    if (!validAddress(to)) throw Object.assign(new Error("invalid recipient"), { code: "invalid_recipient" });
    await transport.sendMail({
      from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(message.replyTo && validAddress(message.replyTo) ? { replyTo: message.replyTo } : {}),
      ...(message.attachment ? { attachments: [message.attachment] } : {}),
    });
    await log.updateOne({ key: doc.key }, { $set: { status: "sent", attempts, sentAt: now, updatedAt: now, lastErrorCode: null, nextAttemptAt: null } });
    return { status: "sent" };
  } catch (error) {
    const code = errorCodeOf(error);
    await log.updateOne({ key: doc.key }, { $set: { status: "failed", attempts, lastErrorCode: code, updatedAt: now, nextAttemptAt: backoffAfter(attempts, now) } }).catch(() => {});
    try {
      await appendAuditEvent(db, { actorId: null, action: "mail.delivery_failed", targetType: "Booking", targetId: String(doc.bookingId), outcome: "failure", details: { event: String(doc.event).slice(0, 60), attempts: String(attempts), code } });
    } catch {
      // No other reporting channel: the booking change already succeeded.
    }
    return { status: "failed", code };
  }
}

// message: { subject, text, html, replyTo?, attachment? }. allowRetry lets a caller (the retry job, the reminder job,
// the Resend button) try again after a failure; without it an existing record is never sent again.
export async function deliverMail({ db, transport, from, key, event, bookingId, role, to, message, hashSecret = "", now = new Date(), allowRetry = false, context = {} }) {
  const log = db.collection(MAIL_LOG);
  let doc = { key, event, bookingId: String(bookingId), role, recipientMasked: maskEmail(to), recipientHash: hashRecipient(to, hashSecret), status: "queued", attempts: 0, lastErrorCode: null, nextAttemptAt: null, createdAt: now, updatedAt: now, sentAt: null, context };
  try {
    await log.insertOne(doc);
  } catch (error) {
    if (error?.code !== 11000) return { status: "failed", code: errorCodeOf(error) };
    const existing = await log.findOne({ key });
    if (!existing) return { status: "skipped", reason: "missing" };
    if (existing.status === "sent") return { status: "skipped", reason: "already_sent" };
    const stale = new Date(now.getTime() - STALE_QUEUED_MS);
    if (existing.status === "queued" && existing.updatedAt > stale) return { status: "skipped", reason: "in_progress" };
    if (!allowRetry) return { status: "skipped", reason: existing.status };
    if ((existing.attempts ?? 0) >= MAX_ATTEMPTS) return { status: "failed", code: existing.lastErrorCode ?? "max_attempts", reason: "max_attempts" };
    doc = await log.findOneAndUpdate(
      { key, $or: [{ status: "failed" }, { status: "queued", updatedAt: { $lt: stale } }] },
      { $set: { status: "queued", updatedAt: now } },
      { returnDocument: "after" },
    );
    if (!doc) return { status: "skipped", reason: "in_progress" };
  }
  return attempt({ db, transport, from, doc, to, message, now });
}
