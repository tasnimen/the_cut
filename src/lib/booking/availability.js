import { BOOKING_CONFIG } from "@/config/booking";
import { getLocalDayRange, isValidLocalDate } from "@/lib/booking/time";
import { calculateBookingDuration, generateCandidateSlots } from "@/lib/booking/rules";
import { BookingServiceFieldsSchema } from "@/lib/booking/booking-model";

export class BookingError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = "BookingError";
    this.code = code;
    this.status = status;
  }
}

export async function loadBookingOptions(db, { localDate, serviceSlugs, barber = "any", now = new Date(), session = null, config = BOOKING_CONFIG }) {
  if (!isValidLocalDate(localDate)) throw new BookingError("invalid_date", 400);
  if (!Array.isArray(serviceSlugs) || serviceSlugs.length < 1 || serviceSlugs.length > config.maximumServicesPerBooking || new Set(serviceSlugs).size !== serviceSlugs.length) {
    throw new BookingError("invalid_services", 400);
  }
  const services = await db.collection("service").find({ slug: { $in: serviceSlugs }, active: true }, { session }).toArray();
  if (services.length !== serviceSlugs.length || services.some((service) => !BookingServiceFieldsSchema.safeParse(service).success)) {
    throw new BookingError("service_unavailable", 409);
  }
  const serviceBySlug = new Map(services.map((service) => [service.slug, service]));
  const orderedServices = serviceSlugs.map((slug) => serviceBySlug.get(slug));
  if (orderedServices.some((service) => !service)) throw new BookingError("service_unavailable", 400);

  const barbers = await db.collection("barber").find({ active: true, serviceSlugs: { $all: serviceSlugs } }, { session })
    .sort({ name: 1 }).toArray();
  const eligibleBarbers = barber === "any" ? barbers : barbers.filter((candidate) => candidate.slug === barber);
  const visibleBarbers = eligibleBarbers.map((candidate) => ({
    id: String(candidate._id),
    slug: candidate.slug,
    name: candidate.name,
  }));
  if (!eligibleBarbers.length) {
    return { localDate, timeZone: config.timeZone, services: orderedServices.map(toServiceOption), barbers: visibleBarbers, slots: [] };
  }

  const range = getLocalDayRange(localDate, config.timeZone);
  const busyRows = await db.collection("bookingSlot").find({
    barberId: { $in: eligibleBarbers.map((candidate) => String(candidate._id)) },
    slotStart: { $gte: range.start, $lt: range.end },
  }, { session, projection: { barberId: 1, slotStart: 1, bookingId: 1 } }).toArray();
  const busySlotKeys = new Set(busyRows.map((row) => `${row.barberId}:${row.slotStart.toISOString()}`));
  const bookingCounts = new Map();
  for (const row of busyRows) {
    if (!bookingCounts.has(row.barberId)) bookingCounts.set(row.barberId, new Set());
    bookingCounts.get(row.barberId).add(String(row.bookingId));
  }

  const candidates = [];
  for (const barberRecord of eligibleBarbers) {
    const id = String(barberRecord._id);
    const barberSlots = generateCandidateSlots({
      localDate,
      services: orderedServices,
      barber: { ...barberRecord, id },
      busySlotKeys,
      now,
      config,
    });
    const bookingsThatDay = bookingCounts.get(id)?.size || 0;
    candidates.push(...barberSlots.map((slot) => ({ ...slot, barberSlug: barberRecord.slug, barberName: barberRecord.name, bookingCount: bookingsThatDay })));
  }

  let slots;
  if (barber === "any") {
    const leastBusySlot = new Map();
    for (const slot of candidates) {
      const current = leastBusySlot.get(slot.startsAt);
      if (!current || slot.bookingCount < current.bookingCount || (slot.bookingCount === current.bookingCount && slot.barberName.localeCompare(current.barberName) < 0)) {
        leastBusySlot.set(slot.startsAt, slot);
      }
    }
    slots = [...leastBusySlot.values()];
  } else {
    slots = candidates;
  }
  slots.sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  return {
    localDate,
    timeZone: config.timeZone,
    durationMinutes: calculateBookingDuration(orderedServices),
    bookable: orderedServices.every((service) => Number.isSafeInteger(service.priceMinorUnits) && service.priceMinorUnits > 0),
    services: orderedServices.map(toServiceOption),
    barbers: visibleBarbers,
    slots: slots.map(({ startsAt, label, durationMinutes, barberId, barberSlug, barberName }) => ({ startsAt, label, durationMinutes, barberId, barberSlug, barberName })),
  };
}

function toServiceOption(service) {
  return Object.freeze({
    slug: service.slug,
    name: service.name,
    durationMinutes: service.durationMinutes,
    priceMinorUnits: Number.isSafeInteger(service.priceMinorUnits) && service.priceMinorUnits > 0 ? service.priceMinorUnits : null,
    currency: "USD",
  });
}
