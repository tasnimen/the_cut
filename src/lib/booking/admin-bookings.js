import { formatMoney } from "@/lib/format/money";

// Admin-side booking rules and summaries (pure). The repository enforces the same rules on write.

export const ADMIN_STATUS_LABELS = Object.freeze({
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
});

export const ADMIN_TARGETS = Object.freeze(["confirmed", "completed", "cancelled", "no_show"]);

// Which status changes an admin may make right now. Completing needs the appointment to have started;
// a no-show needs the late-arrival grace period to have passed.
export function adminAllowedActions({ status, startsAt }, { now, graceMinutes }) {
  const start = new Date(startsAt).getTime();
  const time = now.getTime();
  if (status === "pending") return ["confirmed", "cancelled"];
  if (status === "confirmed") {
    const actions = [];
    if (time >= start) actions.push("completed");
    if (time >= start + graceMinutes * 60_000) actions.push("no_show");
    actions.push("cancelled");
    return actions;
  }
  return [];
}

export const ACTION_LABELS = Object.freeze({
  confirmed: "Confirm",
  completed: "Mark completed",
  no_show: "Mark no-show",
  cancelled: "Cancel",
});

export const ADMIN_ERROR_MESSAGES = Object.freeze({
  booking_not_found: "That booking was not found.",
  booking_status_change_not_allowed: "That change is not allowed for this booking right now.",
  booking_not_markable_no_show: "Only a confirmed booking can be marked no-show.",
  late_arrival_grace_not_elapsed: "Too early to mark a no-show. Wait until the late-arrival grace period has passed.",
  account_unavailable: "The customer account is no longer available.",
});

export function adminErrorMessage(code) {
  return ADMIN_ERROR_MESSAGES[code] ?? "That change could not be made. Refresh the page and try again.";
}

// Counts per status and the expected takings of the day (confirmed and completed bookings only).
export function summarizeDay(bookings) {
  const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
  let revenue = 0;
  for (const booking of bookings) {
    if (booking.status in counts) counts[booking.status] += 1;
    if (booking.status === "confirmed" || booking.status === "completed") revenue += booking.totalPriceMinorUnits;
  }
  const currency = bookings[0]?.currency ?? "USD";
  return { counts, total: bookings.length, active: counts.pending + counts.confirmed, expected: formatMoney(revenue, currency) };
}
