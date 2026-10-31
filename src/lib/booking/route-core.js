import "server-only";
import { after } from "next/server";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { ensureApplicationIndexes, getMongo } from "@/lib/db/mongo";
import { consumePublicRateLimit } from "@/lib/security/public-rate-limit";
import { getBookingConfig } from "@/lib/catalog/source";
import { BookingAvailabilityQuerySchema, BookingIdSchema, CreateBookingSchema, RescheduleBookingSchema } from "@/lib/booking/booking-model";
import { BookingError, loadBookingOptions, loadDateStates } from "@/lib/booking/availability";
import { createBookingRepository } from "@/lib/booking/repository";
import { notifyBookingChange } from "@/lib/booking/notify";

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
  const config = await getBookingConfig();
  return { client, db, config, repository: createBookingRepository({ client, db, config }) };
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
    const { db, config } = await connect();
    return json(await loadBookingOptions(db, { localDate: query.data.date, serviceSlugs: query.data.services, barber: query.data.barber, config }));
  } catch (error) { return failure(error); }
}

// The state of every date in the booking window (open, full, closed, past) for the calendar. Same rules as the times.
export async function getAvailabilityDates(request) {
  try {
    const rate = await consumePublicRateLimit(request, { bucket: "booking-availability-dates", ...RATE });
    if (!rate.allowed) return json({ error: "rate_limited" }, 429);
    const url = new URL(request.url);
    const query = BookingAvailabilityQuerySchema.omit({ date: true }).safeParse({ services: url.searchParams.getAll("service"), barber: url.searchParams.get("barber") || "any" });
    if (!query.success) return json({ error: "invalid_query" }, 400);
    const { db, config } = await connect();
    return json({ timeZone: config.timeZone, dates: await loadDateStates(db, { serviceSlugs: query.data.services, barber: query.data.barber, config }) });
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
    after(() => notifyBookingChange({ db, operation: "created", booking, customerUserId: principal.id }));
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
    const principal = await requirePrincipal(operation === "no-show" ? "bookingsManageAll" : "bookingOwn", operation === "no-show" ? { capability: "bookings.changeStatus" } : {});
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
    if (operation !== "no-show") after(() => notifyBookingChange({ db, principal, operation, booking }));
    return json({ booking });
  } catch (error) { return failure(error); }
}
