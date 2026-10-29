"use server";

import { after } from "next/server";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { BookingError } from "@/lib/booking/availability";
import { BookingIdSchema, RescheduleBookingSchema } from "@/lib/booking/booking-model";
import { notifyBookingChange } from "@/lib/booking/notify";
import { openBookingRepository } from "@/lib/booking/service";
import { bookingErrorMessage } from "@/lib/booking/user-bookings";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export is a public HTTP endpoint: each call re-checks the session and the bookingOwn
// permission, and the repository re-checks ownership (the booking must belong to the caller), the
// booking status and the cancellation cutoff. The id and fields come from the client and are validated.

const RATE = { bucket: "user-bookings", limit: 20, windowMs: 60_000 };
const DENIED = { status: "error", code: "denied", message: "Please sign in again to continue." };

async function authorize() {
  try {
    const principal = await requirePrincipal("bookingOwn");
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many requests. Wait a moment and try again." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

function failure(error) {
  if (error instanceof BookingError) return { status: "error", code: error.code, message: bookingErrorMessage(error.code) };
  throw error;
}

export async function cancelBookingAction(bookingId) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  if (!BookingIdSchema.safeParse(bookingId).success) return { status: "error", code: "booking_not_found", message: bookingErrorMessage("booking_not_found") };

  try {
    const { db, repository } = await openBookingRepository();
    const booking = await repository.cancel({ principal: auth.principal, bookingId });
    after(() => notifyBookingChange({ db, principal: auth.principal, operation: "cancel", booking }));
    return { status: "success", code: "cancelled", message: "Your appointment was cancelled." };
  } catch (error) {
    return failure(error);
  }
}

export async function rescheduleBookingAction(bookingId, startsAt, barber = "any") {
  const auth = await authorize();
  if (auth.error) return auth.error;
  if (!BookingIdSchema.safeParse(bookingId).success) return { status: "error", code: "booking_not_found", message: bookingErrorMessage("booking_not_found") };
  const parsed = RescheduleBookingSchema.safeParse({ startsAt, barber });
  if (!parsed.success) return { status: "error", code: "invalid", message: "Choose an available time." };

  try {
    const { db, repository } = await openBookingRepository();
    const booking = await repository.reschedule({ principal: auth.principal, bookingId, ...parsed.data });
    after(() => notifyBookingChange({ db, principal: auth.principal, operation: "reschedule", booking }));
    return { status: "success", code: "rescheduled", message: "Your appointment was rescheduled." };
  } catch (error) {
    return failure(error);
  }
}
