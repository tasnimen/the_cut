// Pure helpers for the customer's own appointments (no database, no server APIs).
// The booking repository stays the authority: it re-checks ownership, status and the cutoff on every
// cancel and reschedule. These helpers only decide what the screens offer, using the same rule.

export const UPCOMING_STATUSES = Object.freeze(["pending", "confirmed"]);

// `bookings` are the repository's public DTOs (ISO strings). Returns upcoming (soonest first) and
// history (most recent first). A confirmed booking whose end time has passed counts as history.
export function splitBookings(bookings, now = new Date()) {
  const upcoming = [];
  const history = [];
  for (const booking of bookings) {
    const isUpcoming = UPCOMING_STATUSES.includes(booking.status) && new Date(booking.endsAt).getTime() > now.getTime();
    (isUpcoming ? upcoming : history).push(booking);
  }
  upcoming.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  history.sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
  return { upcoming, history };
}

// What the customer may do with an upcoming booking right now.
export function bookingChangeOptions(booking, { now = new Date(), cutoffHours }) {
  const cutoffAt = new Date(booking.startsAt).getTime() - cutoffHours * 60 * 60 * 1000;
  const beforeCutoff = now.getTime() <= cutoffAt;
  return {
    canCancel: UPCOMING_STATUSES.includes(booking.status) && beforeCutoff,
    canReschedule: booking.status === "confirmed" && beforeCutoff,
    cutoffAt: new Date(cutoffAt).toISOString(),
  };
}

export const STATUS_LABELS = Object.freeze({ pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No-show" });

export function summarize(bookings, now = new Date()) {
  const { upcoming, history } = splitBookings(bookings, now);
  return {
    upcomingCount: upcoming.length,
    completedCount: history.filter((booking) => booking.status === "completed").length,
    cancelledCount: history.filter((booking) => booking.status === "cancelled").length,
    next: upcoming[0] ?? null,
  };
}

// Friendly text for the repository's error codes (never raw codes or details).
export function bookingErrorMessage(code) {
  switch (code) {
    case "cancellation_cutoff_passed":
    case "reschedule_cutoff_passed":
      return "Appointments can be changed up to 24 hours before they start. Please contact the shop to change this one.";
    case "booking_not_found":
      return "We could not find that appointment.";
    case "booking_not_cancellable":
    case "booking_not_reschedulable":
      return "This appointment can no longer be changed.";
    case "slot_just_taken":
    case "slot_unavailable":
      return "That time is no longer available. Choose another time.";
    default:
      return "We could not complete that. Please try again.";
  }
}
