import { z } from "zod";
import { normalizeUsPhone } from "@/lib/booking/input";

export const BOOKING_COLLECTION = "booking";
export const BOOKING_SLOT_COLLECTION = "bookingSlot";
export const SERVICE_COLLECTION = "service";
export const BARBER_COLLECTION = "barber";
export const ACTIVE_BOOKING_STATUSES = Object.freeze(["pending", "confirmed"]);
export const BOOKING_STATUSES = Object.freeze(["pending", "confirmed", "cancelled", "completed", "no_show"]);

const weekdaySchedule = z.object({ open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).strict();

export const ServiceRecordSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500),
  durationMinutes: z.number().int().positive().max(480),
  priceMinorUnits: z.number().safe().int().positive().nullable(),
  currency: z.literal("USD"),
  active: z.boolean(),
  displayOrder: z.number().int().min(0).max(999).optional(),
  category: z.string().max(40).optional(),
  icon: z.string().max(40).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).strict();

export const BookingServiceFieldsSchema = ServiceRecordSchema.pick({
  slug: true,
  name: true,
  durationMinutes: true,
  currency: true,
  active: true,
}).extend({ priceMinorUnits: z.unknown() }).loose();

export const BarberRecordSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  name: z.string().trim().min(1).max(120),
  active: z.boolean(),
  serviceSlugs: z.array(z.string().max(100)).max(50),
  weeklySchedule: z.object({ sunday: weekdaySchedule.optional(), monday: weekdaySchedule.optional(), tuesday: weekdaySchedule.optional(), wednesday: weekdaySchedule.optional(), thursday: weekdaySchedule.optional(), friday: weekdaySchedule.optional(), saturday: weekdaySchedule.optional() }).strict(),
  breaks: z.object({ sunday: weekdaySchedule.optional(), monday: weekdaySchedule.optional(), tuesday: weekdaySchedule.optional(), wednesday: weekdaySchedule.optional(), thursday: weekdaySchedule.optional(), friday: weekdaySchedule.optional(), saturday: weekdaySchedule.optional() }).strict(),
  daysOff: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(400),
  createdAt: z.date(),
  updatedAt: z.date(),
}).strict();

export const BookingServiceSnapshotSchema = z.object({
  slug: z.string().max(100),
  name: z.string().max(120),
  durationMinutes: z.number().int().positive(),
  priceMinorUnits: z.number().safe().int().positive(),
  currency: z.literal("USD"),
}).strict();

export const BookingRecordSchema = z.object({
  userId: z.string().min(1).max(128),
  customerName: z.string().trim().min(1).max(100),
  phoneE164: z.string().regex(/^\+1\d{10}$/).nullable(),
  smsConsent: z.boolean(),
  smsConsentAt: z.date().nullable(),
  services: z.array(BookingServiceSnapshotSchema).min(1).max(3),
  barberId: z.string().min(1).max(128),
  barberName: z.string().max(120),
  startsAt: z.date(),
  endsAt: z.date(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().nonnegative(),
  totalPriceMinorUnits: z.number().int().nonnegative(),
  currency: z.literal("USD"),
  status: z.enum(BOOKING_STATUSES),
  createdAt: z.date(),
  updatedAt: z.date(),
  cancelledAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  noShowAt: z.date().nullable(),
  reminderDueAt: z.date().nullable(),
  reminderSentAt: z.date().nullable(),
  reminderClaimedAt: z.date().nullable(),
}).strict();

export const BookingAvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  services: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)).min(1).max(3),
  barber: z.string().regex(/^(any|[a-z0-9]+(?:-[a-z0-9]+)*)$/).default("any"),
}).strict().refine((value) => new Set(value.services).size === value.services.length, { message: "Services must be unique" });

export const CreateBookingSchema = z.object({
  serviceSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)).min(1).max(3),
  startsAt: z.string().datetime({ offset: true }),
  barber: z.string().regex(/^(any|[a-z0-9]+(?:-[a-z0-9]+)*)$/).default("any"),
  phone: z.string().trim().max(40).optional().default("").refine((value) => value === "" || normalizeUsPhone(value) !== null, { message: "Enter a valid US phone number." }),
  smsConsent: z.boolean().default(false),
}).strict().refine((value) => new Set(value.serviceSlugs).size === value.serviceSlugs.length, { message: "Services must be unique" });

export const RescheduleBookingSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  barber: z.string().regex(/^(any|[a-z0-9]+(?:-[a-z0-9]+)*)$/).default("any"),
}).strict();

export const BookingIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
