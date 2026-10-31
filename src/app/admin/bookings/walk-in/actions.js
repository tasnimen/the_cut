"use server";

import { after } from "next/server";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { adminErrorMessage } from "@/lib/booking/admin-bookings";
import { BookingError } from "@/lib/booking/availability";
import { notifyBookingChange } from "@/lib/booking/notify";
import { openBookingRepository } from "@/lib/booking/service";
import { walkInFieldErrors, WalkInAvailabilitySchema, WalkInBookingSchema } from "@/lib/booking/walk-in";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";
import { logServerError } from "@/lib/utils/log-error";

// Every export is a public HTTP endpoint: each call re-checks session, role, TOTP and bookingsManageAll.
// The client sends only names, service slugs, a time and a barber slug; prices, durations and the end
// time come from the database, and the repository re-checks the slot inside a transaction.

const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };
const UNEXPECTED = { status: "error", code: "unexpected", message: "Something went wrong on the server. The walk-in may not have been saved: check Today's bookings, then try again." };

async function authorize(bucket, limit) {
  try {
    const principal = await requirePrincipal("bookingsManageAll", { capability: "bookings.walkIn" });
    const rate = await consumeUserRateLimit(principal.id, { bucket, limit, windowMs: 60_000 });
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many requests. Wait a moment and try again." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    logServerError("walk-in", error);
    return { error: UNEXPECTED };
  }
}

function failure(error) {
  if (error instanceof BookingError) {
    const message = error.code === "slot_unavailable" || error.code === "slot_just_taken" ? "That time was just taken. Pick another time." : error.code === "duplicate_request" ? "This walk-in was just booked. Check Today's bookings." : error.code === "invalid_phone" ? "Enter a valid US phone number, or leave it blank." : adminErrorMessage(error.code);
    return { status: "error", code: error.code, message };
  }
  logServerError("walk-in", error);
  return UNEXPECTED;
}

export async function walkInAvailabilityAction(input) {
  const auth = await authorize("admin-walk-in-availability", 60);
  if (auth.error) return auth.error;
  const parsed = WalkInAvailabilitySchema.safeParse(input);
  if (!parsed.success) return { status: "error", code: "invalid", message: "Choose a date and at least one service." };

  try {
    const { repository } = await openBookingRepository();
    const options = await repository.adminAvailability({ localDate: parsed.data.date, serviceSlugs: parsed.data.serviceSlugs, barber: parsed.data.barber });
    return {
      status: "success",
      barbers: options.barbers.map((barber) => ({ slug: barber.slug, name: barber.name })),
      slots: options.slots.map((slot) => ({ startsAt: slot.startsAt, label: slot.label, barberName: slot.barberName })),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function createWalkInAction(input) {
  const auth = await authorize("admin-walk-in", 20);
  if (auth.error) return auth.error;
  const parsed = WalkInBookingSchema.safeParse(input);
  if (!parsed.success) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: walkInFieldErrors(parsed.error) };

  try {
    const { db, repository } = await openBookingRepository();
    const booking = await repository.createWalkIn({ principal: auth.principal, ...parsed.data });
    // A confirmation goes out only when an email address was entered (a walk-in has no account).
    if (parsed.data.email) after(() => notifyBookingChange({ db, operation: "walk_in", booking, customerUserId: `walkin:${booking.id}` }));
    return { status: "success", code: "created", message: "Walk-in booked.", bookingId: booking.id, when: booking.localStart };
  } catch (error) {
    return failure(error);
  }
}
