import { userIdFilter } from "@/lib/db/user-filter";
import "server-only";
import { after } from "next/server";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { ensureApplicationIndexes, getMongo } from "@/lib/db/mongo";
import { consumePublicRateLimit } from "@/lib/security/public-rate-limit";
import { appendAuditEvent } from "@/lib/security/audit-log";
import { sendBookingCancellation, sendBookingConfirmation, sendBookingReschedule } from "@/lib/mail/mailer";
import { BOOKING_CONFIG } from "@/config/booking";
import { BookingAvailabilityQuerySchema, BookingIdSchema, CreateBookingSchema, RescheduleBookingSchema } from "@/lib/booking/booking-model";
import { BookingError, loadBookingOptions } from "@/lib/booking/availability";
import { createBookingRepository } from "@/lib/booking/repository";

const RATE = { limit: 20, windowMs: 10 * 60 * 1000 };
const CREATE_RATE = { limit: 5, windowMs: 60 * 60 * 1000 };

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function failure(error) {
  if (error instanceof AuthorizationError) return json({ error: error.status === 401 ? "authentication_required" : "forbidden" }, error.status);
  if (error instanceof BookingError) return json({ error: error.code }, error.status);
  return json({ error: "booking_unavailable" }, 500);
}

async function connect() {
  const { client, db } = await getMongo();
  await ensureApplicationIndexes(db);
  return { client, db, repository: createBookingRepository({ client, db }) };
}

export async function getAvailability(request) {
  try {
    const rate = await consumePublicRateLimit(request, { bucket: "booking-availability", ...RATE });
    if (!rate.allowed) return json({ error: "rate_limited" }, 429);
    const url = new URL(request.url);
    const query = BookingAvailabilityQuerySchema.safeParse({
      date: url.searchParams.get("date"), services: url.searchParams.getAll("service"), barber: url.searchParams.get("barber") || "any",
    });
    if (!query.success) return json({ error: "invalid_query" }, 400);
    const { db } = await connect();
    return json(await loadBookingOptions(db, { localDate: query.data.date, serviceSlugs: query.data.services, barber: query.data.barber, config: BOOKING_CONFIG }));
  } catch (error) { return failure(error); }
}

export async function createBooking(request) {
  try {
    const principal = await requirePrincipal("bookingOwn");
    const rate = await consumePublicRateLimit(request, { bucket: "booking-create", ...CREATE_RATE });
    if (!rate.allowed) return json({ error: "rate_limited" }, 429);
    const body = await request.json();
    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) return json({ error: "invalid_booking" }, 400);
    const { client, db, repository } = await connect();
    const booking = await repository.create({ principal, serviceSlugs: parsed.data.serviceSlugs, startsAt: parsed.data.startsAt, barber: parsed.data.barber, phone: parsed.data.phone, smsConsent: parsed.data.smsConsent });
    after(async () => {
      try {
        const user = await db.collection("user").findOne(userIdFilter(principal.id), { projection: { email: 1 } });
        if (!user?.email) throw new Error("recipient unavailable");
        await sendBookingConfirmation({ to: user.email, name: booking.customerName, booking });
      } catch {
        try { await appendAuditEvent(db, { actorId: principal.id, action: "booking.confirmation.delivery_failed", targetType: "Booking", targetId: booking.id, outcome: "failure" }); } catch { /* Keep delivery/provider details out of logs. */ }
      }
    });
    void client;
    return json({ booking }, 201);
  } catch (error) { return failure(error); }
}

export async function listBookings() {
  try {
    const principal = await requirePrincipal("bookingOwn");
    const { repository } = await connect();
    return json(await repository.listMine({ principal }));
  } catch (error) { return failure(error); }
}

export async function mutateBooking(request, { params }, operation) {
  try {
    const principal = await requirePrincipal(operation === "no-show" ? "bookingsManageAll" : "bookingOwn");
    const rate = await consumePublicRateLimit(request, { bucket: `booking-${operation}`, ...RATE });
    if (!rate.allowed) return json({ error: "rate_limited" }, 429);
    const { id } = await params;
    if (!BookingIdSchema.safeParse(id).success) return json({ error: "booking_not_found" }, 404);
    const { db, repository } = await connect();
    let booking;
    if (operation === "cancel") booking = await repository.cancel({ principal, bookingId: id });
    else if (operation === "reschedule") {
      const parsed = RescheduleBookingSchema.safeParse(await request.json());
      if (!parsed.success) return json({ error: "invalid_booking" }, 400);
      booking = await repository.reschedule({ principal, bookingId: id, ...parsed.data });
    } else booking = await repository.markNoShow({ principal, bookingId: id });
    if (operation !== "no-show") after(async () => {
      try {
        const user = await db.collection("user").findOne(userIdFilter(principal.id), { projection: { email: 1 } });
        if (!user?.email) throw new Error("recipient unavailable");
        const send = operation === "cancel" ? sendBookingCancellation : sendBookingReschedule;
        await send({ to: user.email, name: booking.customerName, booking });
      } catch {
        try { await appendAuditEvent(db, { actorId: principal.id, action: `booking.${operation}.delivery_failed`, targetType: "Booking", targetId: booking.id, outcome: "failure" }); } catch { /* No provider details in logs. */ }
      }
    });
    return json({ booking });
  } catch (error) { return failure(error); }
}
