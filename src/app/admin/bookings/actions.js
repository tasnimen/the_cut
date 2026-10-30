"use server";

import { after } from "next/server";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { ADMIN_TARGETS, adminErrorMessage } from "@/lib/booking/admin-bookings";
import { BookingError } from "@/lib/booking/availability";
import { BookingIdSchema } from "@/lib/booking/booking-model";
import { notifyBookingChange } from "@/lib/booking/notify";
import { isWalkInUserId } from "@/lib/booking/walk-in";
import { openBookingRepository } from "@/lib/booking/service";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export is a public HTTP endpoint: each call re-checks session, role, TOTP and the
// bookingsManageAll permission. The id and target status come from the client and are validated;
// the repository re-checks the status rules (what is allowed right now) in a transaction.

const RATE = { bucket: "admin-bookings", limit: 60, windowMs: 60_000 };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };

export async function changeBookingStatusAction(bookingId, to) {
  let principal;
  try {
    principal = await requirePrincipal("bookingsManageAll", { capability: to === "cancelled" ? "bookings.cancel" : "bookings.changeStatus" });
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { status: "error", code: "rate", message: "Too many changes in a short time. Wait a moment and try again." };
  } catch (error) {
    if (error instanceof AuthorizationError) return DENIED;
    throw error;
  }
  if (!BookingIdSchema.safeParse(bookingId).success) return { status: "error", code: "booking_not_found", message: adminErrorMessage("booking_not_found") };
  if (!ADMIN_TARGETS.includes(to)) return { status: "error", code: "invalid", message: adminErrorMessage("invalid") };

  try {
    const { db, repository } = await openBookingRepository();
    const { booking, customerId } = await repository.adminChangeStatus({ principal, bookingId, to });
    // Walk-ins have no account or email address, so there is nobody to notify.
    if (to === "cancelled" && !isWalkInUserId(customerId)) after(() => notifyBookingChange({ db, principal, operation: "cancel", booking, recipientUserId: customerId }));
    return { status: "success", code: to, message: "Booking updated." };
  } catch (error) {
    if (error instanceof BookingError) return { status: "error", code: error.code, message: adminErrorMessage(error.code) };
    throw error;
  }
}
