import { BOOKING_CONFIG } from "@/config/booking";
import { site } from "@/config/site";
import { formatBookingDateTime } from "@/lib/booking/time";
import { buildIcs, sequenceFor } from "@/lib/mail/ics";
import { renderEmail } from "@/lib/mail/templates/layout";
import { formatAddress } from "@/lib/site/contact";

// Every booking email in one place. Each event says who gets it (customer or shop), the subject, what it says and
// which calendar action goes with it. Times are always shown in the shop's time zone with the abbreviation (ET).

export const BOOKING_EVENTS = Object.freeze({
  confirmed: { audience: "customer", subject: "Your appointment is confirmed", heading: "Your visit is confirmed", intro: "Your appointment is confirmed. We look forward to seeing you.", calendar: "REQUEST", button: "manage", policy: true },
  received: { audience: "customer", subject: "We received your booking request", heading: "We received your request", intro: "Thank you. We have your booking request and will confirm it shortly. You will get another email when it is confirmed.", calendar: null, button: "manage", policy: true },
  walk_in_confirmed: { audience: "customer", subject: "You are booked in", heading: "You are booked in", intro: "Thank you for visiting. Here are the details of your appointment.", calendar: "REQUEST", button: null, policy: true },
  rescheduled: { audience: "customer", subject: "Your appointment was rescheduled", heading: "Your visit has a new time", intro: "Your appointment time has been updated. The details below are the new ones.", calendar: "REQUEST", button: "manage", policy: true, previous: true },
  cancelled_by_customer: { audience: "customer", subject: "Your appointment was cancelled", heading: "Your appointment is cancelled", intro: "You cancelled this appointment, so the time is free again. Nothing is owed.", calendar: "CANCEL", button: "rebook", policy: false },
  cancelled_by_shop: { audience: "customer", subject: "Your appointment was cancelled", heading: "Your appointment is cancelled", intro: "We had to cancel this appointment, and we are sorry for the trouble. Nothing is owed.", calendar: "CANCEL", button: "rebook", policy: false, reason: true },
  completed: { audience: "customer", subject: "Thank you for visiting", heading: "Thank you for visiting", intro: "It was good to see you. We hope you left feeling sharper.", calendar: null, button: "rebook", policy: false },
  no_show: { audience: "customer", subject: "We missed you", heading: "We missed you", intro: "We did not see you at your appointment and have marked it as missed. If something came up, we understand. You are welcome to book again whenever it suits you.", calendar: null, button: "rebook", policy: true },
  reminder: { audience: "customer", subject: "Reminder: your appointment tomorrow", heading: "A reminder about your visit", intro: "This is a reminder about your appointment tomorrow.", calendar: "REQUEST", button: "manage", policy: true },
  shop_new_booking: { audience: "shop", subject: "New booking", heading: "New booking", intro: "A customer booked an appointment.", calendar: null, button: "admin", policy: false, customerDetails: true },
  shop_cancelled_by_customer: { audience: "shop", subject: "Booking cancelled by the customer", heading: "Booking cancelled by the customer", intro: "A customer cancelled an appointment. The time is free again.", calendar: null, button: "admin", policy: false, customerDetails: true },
  shop_rescheduled: { audience: "shop", subject: "Booking rescheduled by the customer", heading: "Booking rescheduled", intro: "A customer moved an appointment to a new time.", calendar: null, button: "admin", policy: false, customerDetails: true, previous: true },
});

const money = (minorUnits, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format((minorUnits || 0) / 100);
const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

export function shopDetails(settings = site) {
  const address = formatAddress(settings.location);
  return { name: clean(settings.name ?? site.name, 80), brand: settings.brand ?? site.brand, phone: clean(settings.contact?.phone, 40), email: clean(settings.contact?.email, 120), address: address ? clean(address, 200) : "" };
}

export function manageUrl(baseUrl) {
  return `${baseUrl}/sign-in?callbackUrl=${encodeURIComponent("/user/appointments")}`;
}

export function policyText(hours = BOOKING_CONFIG.cancellationCutoffHours) {
  return `You can cancel or reschedule free up to ${hours} hours before your appointment. After that, please contact the shop.`;
}

// booking: the public booking shape (id, customerName, services, barber, startsAt, endsAt, durationMinutes, totalPriceMinorUnits, ...)
export function buildBookingEmail({ event, booking, previousStartsAt = null, reason = "", shop = shopDetails(), baseUrl, now = new Date(), updatedAt = null }) {
  const config = BOOKING_EVENTS[event];
  if (!config) throw new Error(`Unknown booking email event: ${event}`);
  const timeZone = BOOKING_CONFIG.timeZone;
  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);
  const when = formatBookingDateTime(start, timeZone);
  const services = (booking.services ?? []).map((service) => clean(service.name, 120)).join(", ");
  const customerName = clean(booking.customerName, 100) || "there";
  const barberName = clean(booking.barber?.name ?? booking.barberName, 120);
  const siteName = shop.name;

  const details = [
    ["When", when],
    ...(config.previous && previousStartsAt ? [["Was", formatBookingDateTime(new Date(previousStartsAt), timeZone)]] : []),
    [(booking.services ?? []).length === 1 ? "Service" : "Services", services],
    ["Barber", barberName],
    ["Duration", `${booking.durationMinutes} minutes`],
    ["Price", `${money(booking.totalPriceMinorUnits, booking.currency)} before tax, paid at the shop`],
    ...(config.audience === "shop" ? [["Customer", customerName], ...(booking.phone ? [["Phone", booking.phone]] : [])] : []),
    ...(shop.address && config.audience === "customer" ? [["Where", shop.address]] : []),
  ];

  const paragraphs = config.audience === "customer" ? [`Hello ${customerName},`, config.intro] : [config.intro];
  if (config.reason && clean(reason, 300)) paragraphs.push(`Reason: ${clean(reason, 300)}`);

  const button = {
    manage: { label: "Manage your booking", url: manageUrl(baseUrl) },
    rebook: { label: "Book again", url: `${baseUrl}/booking` },
    admin: { label: "Open bookings", url: `${baseUrl}/admin/bookings` },
  }[config.button] ?? null;

  const footerLines = [
    siteName,
    ...(shop.address ? [shop.address] : []),
    ...(shop.phone ? [`Phone: ${shop.phone}`] : []),
    ...(config.audience === "customer" ? ["All times are Eastern Time (ET), the shop's time zone."] : []),
  ];

  const { html, text } = renderEmail({
    brand: shop.brand,
    preheader: `${config.heading}: ${when}`,
    heading: config.heading,
    paragraphs,
    details,
    button,
    note: config.policy ? policyText() : "",
    footerLines,
  });

  const subject = `${config.subject}${config.audience === "shop" ? `: ${customerName}, ${when}` : ""} | ${siteName}`;

  let attachment = null;
  if (config.calendar) {
    const uid = `booking-${booking.id}@${new URL(baseUrl).hostname}`;
    const content = buildIcs({
      uid,
      method: config.calendar,
      sequence: sequenceFor(updatedAt ?? booking.updatedAt ?? now),
      start,
      end,
      summary: `${services || "Appointment"} at ${siteName}`,
      description: `${barberName ? `With ${barberName}. ` : ""}${money(booking.totalPriceMinorUnits, booking.currency)} before tax, paid at the shop.`,
      location: shop.address,
      now,
    });
    attachment = { filename: config.calendar === "CANCEL" ? "cancelled-appointment.ics" : "appointment.ics", content, contentType: `text/calendar; charset=utf-8; method=${config.calendar}` };
  }

  return { subject, text, html, attachment, audience: config.audience };
}
