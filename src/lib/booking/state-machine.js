import { BOOKING_STATUSES } from "@/lib/booking/booking-model";

const TRANSITIONS = Object.freeze({
  pending: Object.freeze(["confirmed", "cancelled"]),
  confirmed: Object.freeze(["cancelled", "completed", "no_show"]),
  cancelled: Object.freeze([]),
  completed: Object.freeze([]),
  no_show: Object.freeze([]),
});

export function canTransitionBooking(currentStatus, nextStatus) {
  return BOOKING_STATUSES.includes(currentStatus) && (TRANSITIONS[currentStatus] || []).includes(nextStatus);
}

export function transitionBooking(currentStatus, nextStatus) {
  if (!canTransitionBooking(currentStatus, nextStatus)) {
    const error = new Error("booking_state_transition_invalid");
    error.code = "invalid_transition";
    throw error;
  }
  return nextStatus;
}

