import { BOOKING_CONFIG } from "@/config/booking";
import { addLocalCalendarDays, businessDate, getLocalDayRange, isValidLocalDate } from "@/lib/booking/time";
import { calculateBookingDuration, evaluateSlots } from "@/lib/booking/rules";
import { BookingServiceFieldsSchema } from "@/lib/booking/booking-model";

export class BookingError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = "BookingError";
    this.code = code;
    this.status = status;
  }
}

// The one place that decides what can be booked. The public booking page, the booking itself (inside its transaction),
// rescheduling, walk-ins, the date calendar and the schedule view all call it, so they can never disagree.
// A time is bookable only when: the service is shown and bookable, the barber is active and taking bookings that day,
// the time is inside the shop's and the barber's hours and not in a break, it is not in the past or too soon, no booking
// holds it (booked time includes the cleanup buffer, for that barber only) and no time block covers it.
// Blocks, pauses and switched-off services only stop NEW bookings: nothing here ever touches an existing booking.

export const SLOT_REASON_LABELS = Object.freeze({ past: "Past", booked: "Booked", blocked: "Unavailable", break: "Break", unavailable: "Unavailable" });
export const BARBER_STATE_LABELS = Object.freeze({ available: "", full: "Fully booked", off: "Unavailable on this date", paused: "Not taking bookings" });

const REASON_PRIORITY = ["booked", "blocked", "break", "unavailable", "past"];

// Is this barber not taking bookings on that local date? (acceptingBookings false, optionally until a date, inclusive)
export const isBarberPaused = (barber, localDate) => barber.acceptingBookings === false && (!barber.pausedUntil || localDate <= barber.pausedUntil);

async function loadInputs(db, { serviceSlugs, barber, session, config }) {
  if (!Array.isArray(serviceSlugs) || serviceSlugs.length < 1 || serviceSlugs.length > config.maximumServicesPerBooking || new Set(serviceSlugs).size !== serviceSlugs.length) {
    throw new BookingError("invalid_services", 400);
  }
  const services = await db.collection("service").find({ slug: { $in: serviceSlugs }, active: true }, { session }).toArray();
  if (services.length !== serviceSlugs.length || services.some((service) => service.bookable === false || !BookingServiceFieldsSchema.safeParse(service).success)) {
    throw new BookingError("service_unavailable", 409);
  }
  const serviceBySlug = new Map(services.map((service) => [service.slug, service]));
  const orderedServices = serviceSlugs.map((slug) => serviceBySlug.get(slug));
  if (orderedServices.some((service) => !service)) throw new BookingError("service_unavailable", 400);
  const barbers = await db.collection("barber").find({ active: true, serviceSlugs: { $all: serviceSlugs } }, { session }).sort({ name: 1 }).toArray();
  const allBarbers = barbers.map((record) => ({ ...record, id: String(record._id) }));
  const eligibleBarbers = barber === "any" ? allBarbers : allBarbers.filter((candidate) => candidate.slug === barber);
  return { orderedServices, eligibleBarbers, allBarbers };
}

async function loadBusyAndBlocks(db, { barberIds, rangeStart, rangeEnd, session }) {
  if (!barberIds.length) return { busyRows: [], blocks: [] };
  const busyRows = await db.collection("bookingSlot").find({ barberId: { $in: barberIds }, slotStart: { $gte: rangeStart, $lt: rangeEnd } }, { session, projection: { barberId: 1, slotStart: 1, bookingId: 1 } }).toArray();
  const blocks = await db.collection("timeBlock").find({ status: "active", barberId: { $in: [...barberIds, null] }, startsAt: { $lt: rangeEnd }, endsAt: { $gt: rangeStart } }, { session, projection: { barberId: 1, startsAt: 1, endsAt: 1 } }).toArray();
  return { busyRows, blocks };
}

// One local day: the full grid (with a reason for every time that cannot be booked), the bookable times, each barber's state
// and the date's state (closed, full or open).
function evaluateDay({ localDate, orderedServices, eligibleBarbers, busyRows, blocks, barber, now, config }) {
  const busySlotKeys = new Set(busyRows.map((row) => `${row.barberId}:${row.slotStart.toISOString()}`));
  const bookingCounts = new Map();
  for (const row of busyRows) {
    if (!bookingCounts.has(row.barberId)) bookingCounts.set(row.barberId, new Set());
    bookingCounts.get(row.barberId).add(String(row.bookingId));
  }

  const perBarber = eligibleBarbers.map((record) => {
    const paused = isBarberPaused(record, localDate);
    const evaluated = evaluateSlots({ localDate, services: orderedServices, barber: record, busySlotKeys, blocks, paused, now, config });
    const bookingCount = bookingCounts.get(record.id)?.size || 0;
    return { record, paused, evaluated, bookingCount };
  });

  const barbers = perBarber.map(({ record, paused, evaluated }) => {
    const future = evaluated.filter((slot) => slot.reason !== "past");
    let state = "available";
    if (paused) state = "paused";
    else if (!evaluated.some((slot) => slot.available)) state = future.length && future.every((slot) => slot.reason === "unavailable" || slot.reason === "break") ? "off" : future.length ? "full" : "off";
    return { id: record.id, slug: record.slug, name: record.name, state, stateLabel: BARBER_STATE_LABELS[state] };
  });

  // Merge the barbers' times into one grid ("any barber" keeps the least busy free barber for each time).
  const byTime = new Map();
  for (const { record, evaluated, bookingCount } of perBarber) {
    for (const slot of evaluated) {
      const entry = { ...slot, barberSlug: record.slug, barberName: record.name, bookingCount };
      const current = byTime.get(slot.startsAt);
      if (!current) { byTime.set(slot.startsAt, { ...entry, reasons: slot.available ? [] : [slot.reason] }); continue; }
      if (slot.available) {
        const better = !current.available || bookingCount < current.bookingCount || (bookingCount === current.bookingCount && record.name.localeCompare(current.barberName) < 0);
        byTime.set(slot.startsAt, better ? { ...entry, reasons: [] } : current);
      } else if (!current.available) {
        current.reasons.push(slot.reason);
      }
    }
  }
  const grid = [...byTime.values()].map((entry) => {
    const reason = entry.available ? null : (REASON_PRIORITY.find((candidate) => entry.reasons.includes(candidate)) ?? entry.reason);
    return { startsAt: entry.startsAt, label: entry.label, durationMinutes: entry.durationMinutes, state: entry.available ? "available" : reason, available: entry.available, reason, ...(entry.available ? { barberId: entry.barberId, barberSlug: entry.barberSlug, barberName: entry.barberName } : {}) };
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const slots = grid.filter((slot) => slot.available).map(({ startsAt, label, durationMinutes, barberId, barberSlug, barberName }) => ({ startsAt, label, durationMinutes, barberId, barberSlug, barberName }));
  const closed = grid.length === 0;
  const dateState = closed ? "closed" : slots.length ? "open" : grid.every((slot) => slot.reason === "past") ? "past" : "full";
  return { grid, slots, barbers, dateState, durationMinutes: calculateBookingDuration(orderedServices) };
}

export async function loadBookingOptions(db, { localDate, serviceSlugs, barber = "any", now = new Date(), session = null, config = BOOKING_CONFIG }) {
  if (!isValidLocalDate(localDate)) throw new BookingError("invalid_date", 400);
  const { orderedServices, eligibleBarbers, allBarbers } = await loadInputs(db, { serviceSlugs, barber, session, config });
  const range = getLocalDayRange(localDate, config.timeZone);
  const { busyRows, blocks } = await loadBusyAndBlocks(db, { barberIds: allBarbers.map((record) => record.id), rangeStart: range.start, rangeEnd: range.end, session });
  // The barber list and the "any barber" state always cover every barber who offers the services, so choosing one
  // barber never makes the others disappear from the page.
  const everyone = evaluateDay({ localDate, orderedServices, eligibleBarbers: allBarbers, busyRows, blocks, barber: "any", now, config });
  const day = barber === "any" ? everyone : evaluateDay({ localDate, orderedServices, eligibleBarbers, busyRows, blocks, barber, now, config });
  const dateState = eligibleBarbers.length ? day.dateState : "full";
  return {
    localDate,
    timeZone: config.timeZone,
    durationMinutes: day.durationMinutes,
    bookable: orderedServices.every((service) => Number.isSafeInteger(service.priceMinorUnits) && service.priceMinorUnits > 0),
    services: orderedServices.map(toServiceOption),
    barbers: everyone.barbers,
    anyBarber: { available: everyone.slots.length > 0, state: everyone.slots.length ? "available" : everyone.dateState, stateLabel: everyone.slots.length ? "" : everyone.dateState === "closed" ? "Closed on this date" : "Fully booked" },
    dateState,
    grid: day.grid,
    slots: day.slots,
  };
}

// For the calendar: the state of every date in the booking window (open, full, closed or past), from the same rules.
export async function loadDateStates(db, { serviceSlugs, barber = "any", now = new Date(), session = null, config = BOOKING_CONFIG }) {
  const { orderedServices, eligibleBarbers, allBarbers } = await loadInputs(db, { serviceSlugs, barber, session, config });
  const first = businessDate(now, config.timeZone);
  const dates = Array.from({ length: config.maximumAdvanceDays + 1 }, (_, index) => addLocalCalendarDays(first, index));
  const rangeStart = getLocalDayRange(dates[0], config.timeZone).start;
  const rangeEnd = getLocalDayRange(dates.at(-1), config.timeZone).end;
  const { busyRows, blocks } = await loadBusyAndBlocks(db, { barberIds: allBarbers.map((record) => record.id), rangeStart, rangeEnd, session });
  return dates.map((localDate) => {
    const day = evaluateDay({ localDate, orderedServices, eligibleBarbers, busyRows, blocks, barber, now, config });
    return { date: localDate, state: eligibleBarbers.length ? day.dateState : "full", availableTimes: day.slots.length };
  });
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
