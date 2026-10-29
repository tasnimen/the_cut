import "server-only";
import { openBookingRepository } from "@/lib/booking/service";
import { businessDate } from "@/lib/booking/time";
import { bookingChangeOptions, splitBookings } from "@/lib/booking/user-bookings";

// The signed-in customer's own appointments for the dashboard, ready to render. The repository only
// returns bookings owned by `principal.id`; nothing here accepts a user id from the client.
export async function loadMyBookings(principal) {
  const { repository, config } = await openBookingRepository();
  const { bookings } = await repository.listMine({ principal });
  const now = new Date();
  const { upcoming, history } = splitBookings(bookings, now);
  return {
    today: businessDate(now, config.timeZone),
    cutoffHours: config.cancellationCutoffHours,
    upcoming: upcoming.map((booking) => ({ booking, options: bookingChangeOptions(booking, { now, cutoffHours: config.cancellationCutoffHours }) })),
    history,
  };
}
