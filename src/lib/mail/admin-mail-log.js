import { MAIL_LOG } from "@/lib/mail/delivery";

// Reads the mail log for the Email log screen. Only safe fields leave this module: no keys, no address hashes, no
// message text, no provider text (only an error code), and the address is masked.

export const MAIL_EVENT_LABELS = Object.freeze({
  confirmed: "Booking confirmed", received: "Booking received", walk_in_confirmed: "Walk-in confirmation", rescheduled: "Rescheduled",
  cancelled_by_customer: "Cancelled by the customer", cancelled_by_shop: "Cancelled by the shop", completed: "Thank you", no_show: "Missed visit", reminder: "Reminder",
  shop_new_booking: "Shop: new booking", shop_cancelled_by_customer: "Shop: customer cancelled", shop_rescheduled: "Shop: customer rescheduled",
});
export const MAIL_STATUS_LABELS = Object.freeze({ sent: "Sent", failed: "Failed", queued: "Sending", skipped: "Skipped" });

const PAGE_SIZE = 25;
const STATUSES = Object.keys(MAIL_STATUS_LABELS);

export function parseMailFilters(params = {}) {
  const status = typeof params.status === "string" && STATUSES.includes(params.status) ? params.status : "";
  const page = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  return { status, page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1 };
}

const toEntry = (doc) => ({
  id: String(doc._id),
  event: doc.event,
  label: MAIL_EVENT_LABELS[doc.event] ?? doc.event,
  role: doc.role === "shop" ? "Shop" : "Customer",
  recipient: doc.recipientMasked ?? "",
  status: doc.status,
  attempts: doc.attempts ?? 0,
  errorCode: doc.lastErrorCode ?? null,
  createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
  nextAttemptAt: doc.nextAttemptAt instanceof Date ? doc.nextAttemptAt.toISOString() : null,
});

export async function listMailLog(db, filters) {
  const query = filters.status ? { status: filters.status } : {};
  const log = db.collection(MAIL_LOG);
  const [total, failed, rows] = await Promise.all([
    log.countDocuments(query),
    log.countDocuments({ status: "failed" }),
    log.find(query).sort({ createdAt: -1 }).skip((filters.page - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray(),
  ]);
  return { entries: rows.map(toEntry), total, failed, page: filters.page, pageSize: PAGE_SIZE };
}
