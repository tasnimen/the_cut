import { BOOKING_CONFIG } from "@/config/booking";

// What the booking page tells the customer when the server refuses a booking. One place, so the messages stay
// accurate: a refusal that retrying cannot fix says why instead of "please retry".
export function bookingFailureMessage(code, status = 400, limit = BOOKING_CONFIG.maximumActiveBookingsPerUser) {
  switch (code) {
    case "slot_just_taken":
    case "slot_unavailable":
      return "That time was just taken. Choose another available time.";
    case "active_booking_limit":
      return `You already have ${limit} upcoming appointments, the most you can hold at once. Cancel or move one in My Appointments, then book again.`;
    case "rate_limited":
      return "Too many booking attempts from this connection. Please wait a while, then try again.";
    case "invalid_phone":
      return "Enter a valid US phone number, or leave it blank.";
    case "phone_required_for_sms_consent":
      return "Add a phone number to get text reminders, or untick the reminder box.";
    case "service_unavailable":
    case "invalid_services":
      return "One of the services you chose is no longer available. Please choose again.";
    case "invalid_start_time":
    case "invalid_date":
      return "That date or time is not valid. Choose another one.";
    default:
      return status >= 500 ? "Something went wrong on our side. Please try again in a moment." : "Your booking could not be completed. Please check your choices and try again.";
  }
}

// Which toast to show for the same refusal.
export function bookingFailureToast(code, status) {
  if (code === "slot_just_taken" || code === "slot_unavailable") return "slotTaken";
  if (code === "active_booking_limit") return "bookingLimit";
  if (status === 429) return "rateLimited";
  return status >= 500 ? "unexpected" : "bookingFailure";
}
