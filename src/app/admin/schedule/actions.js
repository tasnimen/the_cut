"use server";

import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { setBarberAccepting } from "@/lib/booking/accepting";
import { createTimeBlock, removeTimeBlock, resolveBlockInterval } from "@/lib/booking/blocks";
import { revalidateCatalog } from "@/lib/catalog/revalidate";
import { SERVICE_SLUG_PATTERN } from "@/lib/catalog/service-input";
import { getMongo } from "@/lib/db/mongo";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export is a public HTTP endpoint: each call re-checks session, role, TOTP and its own Super Admin switch.
// Nothing here ever cancels, moves or edits an existing booking: a block that overlaps one is refused and the
// bookings are listed, so a person can deal with them using the normal booking actions.

const RATE = { bucket: "admin-schedule", limit: 30, windowMs: 60_000 };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };
const INVALID = { status: "error", code: "invalid", message: "That request was not valid." };

async function authorize(capability) {
  try {
    const principal = await requirePrincipal("bookingsManageAll", { capability });
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many changes in a short time. Wait a moment and try again." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

const text = (formData, name, max = 200) => String(formData.get(name) ?? "").slice(0, max);
const BLOCK_MESSAGES = {
  invalid_dates: "Check the dates. The end date cannot be before the start date.",
  range_too_long: "That range is too long. Block at most 62 days at a time.",
  invalid_times: "Check the times. The end time must be after the start time, on one day.",
  barber_not_found: "That barber was not found.",
};

export async function createBlockAction(_previous, formData) {
  const auth = await authorize("availability.block");
  if (auth.error) return auth.error;

  const barberSlug = text(formData, "barber", 100);
  if (barberSlug !== "all" && !SERVICE_SLUG_PATTERN.test(barberSlug)) return INVALID;
  const interval = resolveBlockInterval({ startDate: text(formData, "startDate", 10), endDate: text(formData, "endDate", 10), allDay: formData.get("allDay") === "on", startTime: text(formData, "startTime", 5), endTime: text(formData, "endTime", 5) });
  if (interval.error) return { status: "error", code: interval.error, message: BLOCK_MESSAGES[interval.error] };

  const { db } = await getMongo();
  let barberId = null;
  if (barberSlug !== "all") {
    const barber = await db.collection("barber").findOne({ slug: barberSlug, archivedAt: { $exists: false } }, { projection: { _id: 1 } });
    if (!barber) return { status: "error", code: "barber_not_found", message: BLOCK_MESSAGES.barber_not_found };
    barberId = String(barber._id);
  }
  const result = await createTimeBlock(db, { barberId, startsAt: interval.startsAt, endsAt: interval.endsAt, reason: text(formData, "reason"), actorId: auth.principal.id });
  if (!result.ok && result.error === "conflicts") {
    return { status: "error", code: "conflicts", message: "Not blocked. These bookings are in that time. Nothing was changed. Move or cancel them first from Bookings if you need to, then block the time.", conflicts: result.conflicts };
  }
  if (!result.ok) return { status: "error", code: result.error, message: BLOCK_MESSAGES[result.error] ?? INVALID.message };
  return { status: "success", code: "blocked", message: "Time blocked. Customers can no longer book it." };
}

export async function unblockAction(blockId) {
  const auth = await authorize("availability.unblock");
  if (auth.error) return auth.error;
  if (typeof blockId !== "string" || !/^[a-f\d]{24}$/i.test(blockId)) return INVALID;
  const { db } = await getMongo();
  const result = await removeTimeBlock(db, { blockId, actorId: auth.principal.id });
  if (!result.ok) return { status: "error", code: "not_found", message: "That block was not found." };
  return { status: "success", code: "unblocked", message: "Unblocked. The time can be booked again." };
}

export async function setBarberAcceptingAction(slug, accepting, until = "", note = "") {
  const auth = await authorize("availability.barberToggle");
  if (auth.error) return auth.error;
  if (typeof slug !== "string" || !SERVICE_SLUG_PATTERN.test(slug) || typeof accepting !== "boolean") return INVALID;
  const { db } = await getMongo();
  const result = await setBarberAccepting(db, { slug, accepting, until: typeof until === "string" ? until.slice(0, 10) : "", note: typeof note === "string" ? note : "", actorId: auth.principal.id });
  if (!result.ok) return { status: "error", code: result.error, message: result.error === "invalid_date" ? "Check the date." : "That barber was not found." };
  revalidateCatalog(["barbers"]);
  return {
    status: "success",
    code: accepting ? "resumed" : "paused",
    message: accepting ? "This barber is taking bookings again." : "New bookings are off for this barber. Existing appointments are unchanged.",
    upcomingBookings: result.upcomingBookings,
  };
}
