import { ROUTES } from "@/config/routes";

// A booking keeps the service names, prices and total it was made with. Rescheduling changes the time and barber only;
// later price or name edits never touch an existing booking.
export function rescheduleSnapshot(booking) {
  return { services: booking.services, totalPriceMinorUnits: booking.totalPriceMinorUnits };
}

// "Book again" opens the booking page with the same services selected (the page ignores unknown or switched-off ones).
export function bookAgainHref(booking) {
  const query = new URLSearchParams();
  for (const service of booking.services ?? []) query.append("service", service.slug);
  return `${ROUTES.booking}?${query}`;
}
