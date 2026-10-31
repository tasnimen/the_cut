import "server-only";
import { ObjectId } from "mongodb";
import { env } from "@/config/env";
import { resolveAuthBaseUrl } from "@/lib/auth/base-url";
import { getSiteSettings } from "@/lib/catalog/source";
import { userIdFilter } from "@/lib/db/user-filter";
import { isWalkInUserId } from "@/lib/booking/walk-in";
import { deliverMail, MAIL_LOG, MAX_ATTEMPTS } from "@/lib/mail/delivery";
import { getMailFrom, getMailTransport } from "@/lib/mail/mailer";
import { BOOKING_EVENTS, buildBookingEmail, shopDetails } from "@/lib/mail/templates/booking";

// Sends the booking emails. Call it inside `after()`: it never throws and never waits for the booking. Each email has an
// idempotency key (see lib/mail/delivery.js), so calling it twice for the same change sends once.

// Which events a booking operation produces. The customer gets the first, the shop the second (when there is one).
export const OPERATION_EVENTS = Object.freeze({
  created: (booking) => [booking.status === "pending" ? "received" : "confirmed", "shop_new_booking"],
  walk_in: () => ["walk_in_confirmed"],
  confirmed: () => ["confirmed"],
  reschedule: () => ["rescheduled", "shop_rescheduled"],
  cancel_by_customer: () => ["cancelled_by_customer", "shop_cancelled_by_customer"],
  cancel_by_shop: () => ["cancelled_by_shop"],
  completed: () => ["completed"],
  no_show: () => ["no_show"],
});

// Does the event still make sense for the booking's current status? Used before a retry or a resend.
const RELEVANT = Object.freeze({
  confirmed: ["confirmed"], received: ["pending"], walk_in_confirmed: ["confirmed", "completed"], rescheduled: ["confirmed"], reminder: ["confirmed"],
  cancelled_by_customer: ["cancelled"], cancelled_by_shop: ["cancelled"], completed: ["completed"], no_show: ["no_show"],
  shop_new_booking: ["pending", "confirmed"], shop_cancelled_by_customer: ["cancelled"], shop_rescheduled: ["confirmed"],
});
export const isStillRelevant = (event, status) => (RELEVANT[event] ?? []).includes(status);

// Versioned so a second reschedule to another time is a new email, while a repeat of the same one is not.
export function idempotencyKey({ event, bookingId, role, startsAt }) {
  const version = ["rescheduled", "shop_rescheduled", "reminder"].includes(event) ? new Date(startsAt).getTime() : 1;
  return `${event}:${bookingId}:${role}:${version}`;
}

function context() {
  return { transport: getMailTransport(), from: getMailFrom(), shopTo: env.MAIL_TO, baseUrl: resolveAuthBaseUrl(env), hashSecret: env.BETTER_AUTH_SECRET ?? "" };
}

async function customerEmail({ db, customerUserId, bookingId }) {
  if (isWalkInUserId(customerUserId)) {
    const record = await db.collection("booking").findOne({ _id: new ObjectId(String(bookingId)) }, { projection: { customerEmail: 1 } });
    return record?.customerEmail ?? null;
  }
  const user = await db.collection("user").findOne(userIdFilter(customerUserId), { projection: { email: 1 } });
  return user?.email ?? null;
}

// The public shape the templates use, from a stored booking record.
export function toMailBooking(record) {
  return {
    id: String(record._id),
    customerName: record.customerName,
    phone: record.phoneE164 ?? null,
    services: record.services,
    barber: { id: record.barberId, name: record.barberName },
    startsAt: new Date(record.startsAt).toISOString(),
    endsAt: new Date(record.endsAt).toISOString(),
    durationMinutes: record.durationMinutes,
    totalPriceMinorUnits: record.totalPriceMinorUnits,
    currency: record.currency,
    status: record.status,
    updatedAt: record.updatedAt,
  };
}

async function sendOne({ db, ctx, shop, event, booking, customerUserId, previousStartsAt = null, reason = "", allowRetry = false, now = new Date() }) {
  const audience = BOOKING_EVENTS[event].audience;
  const toCustomer = audience === "customer";
  const customer = await customerEmail({ db, customerUserId, bookingId: booking.id });
  const to = toCustomer ? customer : ctx.shopTo;
  if (!to) return { event, status: "skipped", reason: "no_recipient" };
  const message = buildBookingEmail({ event, booking, previousStartsAt, reason, shop, baseUrl: ctx.baseUrl, now });
  if (!toCustomer && customer) message.replyTo = customer;
  const role = toCustomer ? "customer" : "shop";
  const result = await deliverMail({
    db, transport: ctx.transport, from: ctx.from, event, bookingId: booking.id, role, to, message, hashSecret: ctx.hashSecret, now, allowRetry,
    key: idempotencyKey({ event, bookingId: booking.id, role, startsAt: booking.startsAt }),
    context: { customerUserId: String(customerUserId), ...(previousStartsAt ? { previousStartsAt: new Date(previousStartsAt).toISOString() } : {}), ...(reason ? { reason: String(reason).slice(0, 300) } : {}) },
  });
  return { event, ...result };
}

// operation: a key of OPERATION_EVENTS. booking: the public booking shape (with `previousStartsAt` for a reschedule).
export async function sendBookingMails({ db, operation, booking, customerUserId, reason = "" }) {
  const results = [];
  try {
    const ctx = context();
    const shop = shopDetails(await getSiteSettings());
    for (const event of OPERATION_EVENTS[operation](booking)) {
      try {
        results.push(await sendOne({ db, ctx, shop, event, booking, customerUserId, previousStartsAt: booking.previousStartsAt ?? null, reason }));
      } catch {
        results.push({ event, status: "failed", code: "unexpected" });
      }
    }
  } catch {
    results.push({ status: "failed", code: "setup" });
  }
  return results;
}

// Builds the email again from the stored booking and sends it (retry job and Resend button).
async function redeliver({ db, ctx, shop, entry, now }) {
  const record = await db.collection("booking").findOne({ _id: new ObjectId(entry.bookingId) });
  if (!record || !isStillRelevant(entry.event, record.status)) {
    await db.collection(MAIL_LOG).updateOne({ key: entry.key }, { $set: { status: "skipped", updatedAt: now, nextAttemptAt: null } });
    return { status: "skipped", reason: "no_longer_relevant" };
  }
  return sendOne({ db, ctx, shop, event: entry.event, booking: toMailBooking(record), customerUserId: entry.context?.customerUserId ?? record.userId, previousStartsAt: entry.context?.previousStartsAt ?? null, reason: entry.context?.reason ?? "", allowRetry: true, now });
}

// Hourly job: tries the failed emails that are due again (backoff 5 minutes, 30 minutes, 2 hours; four attempts in all).
export async function retryDueMail({ db, now = new Date(), limit = 25 }) {
  const counts = { sent: 0, failed: 0, skipped: 0 };
  const due = await db.collection(MAIL_LOG).find({ status: "failed", attempts: { $lt: MAX_ATTEMPTS }, nextAttemptAt: { $lte: now } }).sort({ nextAttemptAt: 1 }).limit(limit).toArray();
  if (!due.length) return counts;
  const ctx = context();
  const shop = shopDetails(await getSiteSettings());
  for (const entry of due) {
    try {
      const result = await redeliver({ db, ctx, shop, entry, now });
      counts[result.status === "sent" ? "sent" : result.status === "failed" ? "failed" : "skipped"] += 1;
    } catch {
      counts.failed += 1;
    }
  }
  return counts;
}

// Resend button: only a failed email can be sent again, one attempt now, and a success is final (the key stays).
export async function resendMail({ db, id, now = new Date() }) {
  if (!ObjectId.isValid(String(id))) return { ok: false, error: "not_found" };
  const entry = await db.collection(MAIL_LOG).findOne({ _id: new ObjectId(String(id)) });
  if (!entry) return { ok: false, error: "not_found" };
  if (entry.status !== "failed") return { ok: false, error: "not_failed" };
  // A manual resend always gets one attempt, even after the automatic attempts are used up.
  if ((entry.attempts ?? 0) >= MAX_ATTEMPTS) await db.collection(MAIL_LOG).updateOne({ _id: entry._id, status: "failed" }, { $set: { attempts: MAX_ATTEMPTS - 1 } });
  const result = await redeliver({ db, ctx: context(), shop: shopDetails(await getSiteSettings()), entry: { ...entry, attempts: Math.min(entry.attempts ?? 0, MAX_ATTEMPTS - 1) }, now });
  return { ok: result.status === "sent", status: result.status, reason: result.reason ?? null };
}

// For the reminder job: sends (or confirms already sent) the reminder; throws when it did not go out, so the job tries again.
export async function sendReminderMail({ db, to, name, booking }) {
  const ctx = context();
  const shop = shopDetails(await getSiteSettings());
  const mailBooking = { ...booking, customerName: name ?? booking.customerName, startsAt: new Date(booking.startsAt).toISOString(), endsAt: new Date(booking.endsAt).toISOString() };
  const message = buildBookingEmail({ event: "reminder", booking: mailBooking, shop, baseUrl: ctx.baseUrl });
  const result = await deliverMail({
    db, transport: ctx.transport, from: ctx.from, event: "reminder", bookingId: mailBooking.id, role: "customer", to, message, hashSecret: ctx.hashSecret, allowRetry: true,
    key: idempotencyKey({ event: "reminder", bookingId: mailBooking.id, role: "customer", startsAt: mailBooking.startsAt }),
    context: { customerUserId: String(booking.userId ?? "") },
  });
  if (result.status !== "sent" && !(result.status === "skipped" && result.reason === "already_sent")) throw new Error("reminder_not_sent");
}
