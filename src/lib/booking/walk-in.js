import { z } from "zod";
import { normalizeUsPhone } from "@/lib/booking/input";

// Walk-in bookings: an admin books a customer who is in the shop and has no account. Input is validated
// strictly; prices, durations and the end time are computed on the server like any other booking.

export const WALK_IN_PREFIX = "walkin:";
export const isWalkInUserId = (userId) => typeof userId === "string" && userId.startsWith(WALK_IN_PREFIX);

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const noMarkup = (value) => !/[\u0000-\u001f\u007f<>]/.test(value);

export const WalkInAvailabilitySchema = z.strictObject({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceSlugs: z.array(slug).min(1).max(3),
  barber: z.string().regex(/^(any|[a-z0-9]+(?:-[a-z0-9]+)*)$/).default("any"),
}).refine((value) => new Set(value.serviceSlugs).size === value.serviceSlugs.length, { message: "Services must be unique" });

export const WalkInBookingSchema = z.strictObject({
  customerName: z.string().trim().min(2, "Enter the customer's name.").max(100, "Use 100 characters or fewer.").refine(noMarkup, "Remove special characters from the name."),
  phone: z.string().trim().max(40).default("").refine((value) => value === "" || normalizeUsPhone(value) !== null, { message: "Enter a valid US phone number, or leave it blank." }),
  email: z.string().trim().toLowerCase().max(254).default("").refine((value) => value === "" || /^[^s@<>]+@[^s@<>]+.[^s@<>]+$/.test(value), { message: "Enter a valid email address, or leave it blank." }),
  serviceSlugs: z.array(slug).min(1, "Choose at least one service.").max(3, "Choose up to 3 services."),
  startsAt: z.string().datetime({ offset: true }),
  barber: z.string().regex(/^(any|[a-z0-9]+(?:-[a-z0-9]+)*)$/).default("any"),
}).refine((value) => new Set(value.serviceSlugs).size === value.serviceSlugs.length, { message: "Services must be unique" });

export function walkInFieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// Walk-ins may start right now, so the usual minimum lead time is removed by moving "now" back by it.
export function walkInClock(now, minimumLeadMinutes) {
  return new Date(now.getTime() - minimumLeadMinutes * 60_000);
}
