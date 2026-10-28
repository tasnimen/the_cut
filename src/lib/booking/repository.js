import "server-only";
import { ObjectId } from "mongodb";
import { BOOKING_CONFIG } from "@/config/booking";
import { BOOKING_COLLECTION, BOOKING_SLOT_COLLECTION, ACTIVE_BOOKING_STATUSES } from "@/lib/booking/booking-model";
import { BookingError, loadBookingOptions } from "@/lib/booking/availability";
import { normalizeUsPhone } from "@/lib/booking/input";
import { reservationSlotStarts, calculateBookingDuration } from "@/lib/booking/rules";
import { businessDate, formatBookingDateTime } from "@/lib/booking/time";
import { transitionBooking } from "@/lib/booking/state-machine";
import { appendAuditEvent } from "@/lib/security/audit-log";

const ACTIVE_STATUSES = [...ACTIVE_BOOKING_STATUSES];
const PAGE_SIZE = 50;
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function isDuplicateKey(error) {
  return error?.code === 11000 || error?.code === 251;
}

function asObjectId(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function publicBooking(record) {
  return Object.freeze({
    id: String(record._id),
    customerName: record.customerName,
    phone: record.phoneE164,
    services: record.services,
    barber: { id: record.barberId, name: record.barberName },
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt.toISOString(),
    localStart: formatBookingDateTime(record.startsAt),
    durationMinutes: record.durationMinutes,
    bufferMinutes: record.bufferMinutes,
    totalPriceMinorUnits: record.totalPriceMinorUnits,
    currency: record.currency,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    cancelledAt: record.cancelledAt?.toISOString() || null,
  });
}

function bookingAudit({ actorId, bookingId, action, outcome = "success" }) {
  return {
    actorId,
    action,
    targetType: "Booking",
    targetId: String(bookingId),
    outcome,
  };
}

export function createBookingRepository({ client, db, config = BOOKING_CONFIG, clock = () => new Date() }) {
  async function transaction(work) {
    const session = client.startSession();
    try {
      return await session.withTransaction(() => work(session));
    } catch (error) {
      if (isDuplicateKey(error)) throw new BookingError("slot_just_taken", 409);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async function chooseSlot(session, { serviceSlugs, startsAt, barber, now, excludeBookingId = null }) {
    const localDate = businessDate(startsAt, config.timeZone);
    const availability = await loadBookingOptions(db, {
      localDate,
      serviceSlugs,
      barber,
      now,
      session,
      config,
      excludeBookingId,
    });
    const option = availability.slots.find((slot) => slot.startsAt === startsAt.toISOString());
    if (!option) throw new BookingError("slot_unavailable", 409);
    const serviceRecords = await db.collection("service").find({ slug: { $in: serviceSlugs }, active: true }, { session }).toArray();
    if (serviceRecords.some((service) => !Number.isInteger(service.priceMinorUnits) || service.priceMinorUnits < 0)) {
      throw new BookingError("price_not_configured", 409);
    }
    const barberRecord = await db.collection("barber").findOne({ _id: new ObjectId(option.barberId), active: true }, { session });
    if (!barberRecord) throw new BookingError("slot_unavailable", 409);
    const orderedServices = serviceSlugs.map((slug) => serviceRecords.find((service) => service.slug === slug));
    const durationMinutes = calculateBookingDuration(orderedServices);
    return { option, barberRecord, services: orderedServices, durationMinutes };
  }

  async function holdSlots(session, { bookingId, barberId, startsAt, durationMinutes }) {
    const rows = reservationSlotStarts(startsAt, durationMinutes, config).map((slotStart) => ({
      bookingId,
      barberId,
      slotStart,
    }));
    await db.collection(BOOKING_SLOT_COLLECTION).insertMany(rows, { ordered: true, session });
  }

  return Object.freeze({
    async availability(input) {
      return loadBookingOptions(db, { ...input, config });
    },

    async create({ principal, user, serviceSlugs, startsAt, barber = "any", phone, smsConsent = false }) {
      const start = new Date(startsAt);
      if (!Number.isFinite(start.getTime())) throw new BookingError("invalid_start_time", 400);
      const now = clock();
      return transaction(async (session) => {
        const customer = await db.collection("user").findOne({ id: principal.id }, { session, projection: { id: 1, name: 1 } });
        if (!customer) throw new BookingError("account_unavailable", 401);
        // Serialize this user's concurrent create attempts so the active-booking cap
        // cannot be exceeded by two transactions that both read the same count.
        const customerLock = await db.collection("user").updateOne({ id: principal.id }, { $inc: { bookingMutationVersion: 1 } }, { session });
        if (!customerLock.matchedCount) throw new BookingError("account_unavailable", 401);
      const activeCount = await db.collection(BOOKING_COLLECTION).countDocuments({ userId: principal.id, status: { $in: ACTIVE_STATUSES } }, { session });
        if (activeCount >= config.maximumActiveBookingsPerUser) throw new BookingError("active_booking_limit", 409);
        const { option, barberRecord, services, durationMinutes } = await chooseSlot(session, { serviceSlugs, startsAt: start, barber, now });
        const bookingId = new ObjectId();
        const normalizedPhone = phone ? normalizeUsPhone(phone) : null;
        if (phone && !normalizedPhone) throw new BookingError("invalid_phone", 400);
        if (smsConsent && !normalizedPhone) throw new BookingError("phone_required_for_sms_consent", 400);
        const nowDate = clock();
        const serviceSnapshots = services.map((service) => ({
          slug: service.slug,
          name: service.name,
          durationMinutes: service.durationMinutes,
          priceMinorUnits: service.priceMinorUnits,
          currency: "USD",
        }));
        const booking = {
          _id: bookingId,
          userId: principal.id,
          customerName: String(customer.name || user.name || "Customer").trim().slice(0, 100),
          phoneE164: normalizedPhone,
          smsConsent: Boolean(smsConsent),
          smsConsentAt: smsConsent ? nowDate : null,
          services: serviceSnapshots,
          barberId: String(barberRecord._id),
          barberName: barberRecord.name,
          startsAt: start,
          endsAt: new Date(start.getTime() + durationMinutes * 60_000),
          durationMinutes,
          bufferMinutes: config.cleanupBufferMinutes,
          totalPriceMinorUnits: serviceSnapshots.reduce((sum, service) => sum + service.priceMinorUnits, 0),
          currency: "USD",
          status: transitionBooking("pending", "confirmed"),
          createdAt: nowDate,
          updatedAt: nowDate,
          cancelledAt: null,
          completedAt: null,
          noShowAt: null,
          reminderDueAt: start.getTime() - nowDate.getTime() >= REMINDER_WINDOW_MS ? new Date(start.getTime() - REMINDER_WINDOW_MS) : null,
          reminderSentAt: null,
          reminderClaimedAt: null,
        };
        await holdSlots(session, { bookingId, barberId: booking.barberId, startsAt: start, durationMinutes });
        await db.collection(BOOKING_COLLECTION).insertOne(booking, { session });
        await appendAuditEvent(db, bookingAudit({ actorId: principal.id, bookingId, action: "booking.created" }), { session });
        return publicBooking(booking);
      });
    },

    async listMine({ principal, page = 1 }) {
      const safePage = Number.isInteger(page) ? Math.max(1, Math.min(page, 1000)) : 1;
      const records = await db.collection(BOOKING_COLLECTION)
        .find({ userId: principal.id }, { projection: { userId: 0 } })
        .sort({ startsAt: -1, _id: -1 })
        .skip((safePage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray();
      return { bookings: records.map(publicBooking), page: safePage, pageSize: PAGE_SIZE };
    },

    async cancel({ principal, bookingId }) {
      const id = asObjectId(bookingId);
      if (!id) throw new BookingError("booking_not_found", 404);
      return transaction(async (session) => {
        const booking = await db.collection(BOOKING_COLLECTION).findOne({ _id: id, userId: principal.id }, { session });
        if (!booking) throw new BookingError("booking_not_found", 404);
        if (!ACTIVE_STATUSES.includes(booking.status)) throw new BookingError("booking_not_cancellable", 409);
        if (clock().getTime() > booking.startsAt.getTime() - config.cancellationCutoffHours * 60 * 60 * 1000) {
          throw new BookingError("cancellation_cutoff_passed", 409);
        }
        const cancelledAt = clock();
        const nextStatus = transitionBooking(booking.status, "cancelled");
        await db.collection(BOOKING_COLLECTION).updateOne({ _id: id, userId: principal.id, status: booking.status }, {
          $set: { status: nextStatus, cancelledAt, updatedAt: cancelledAt },
        }, { session });
        await db.collection(BOOKING_SLOT_COLLECTION).deleteMany({ bookingId: id }, { session });
        await appendAuditEvent(db, bookingAudit({ actorId: principal.id, bookingId: id, action: "booking.cancelled" }), { session });
        return publicBooking({ ...booking, status: nextStatus, cancelledAt, updatedAt: cancelledAt });
      });
    },

    async reschedule({ principal, bookingId, startsAt, barber = "any" }) {
      const id = asObjectId(bookingId);
      const start = new Date(startsAt);
      if (!id) throw new BookingError("booking_not_found", 404);
      if (!Number.isFinite(start.getTime())) throw new BookingError("invalid_start_time", 400);
      return transaction(async (session) => {
        const booking = await db.collection(BOOKING_COLLECTION).findOne({ _id: id, userId: principal.id }, { session });
        if (!booking) throw new BookingError("booking_not_found", 404);
        if (booking.status !== "confirmed") throw new BookingError("booking_not_reschedulable", 409);
        if (clock().getTime() > booking.startsAt.getTime() - config.cancellationCutoffHours * 60 * 60 * 1000) {
          throw new BookingError("reschedule_cutoff_passed", 409);
        }
        await db.collection(BOOKING_SLOT_COLLECTION).deleteMany({ bookingId: id }, { session });
        const serviceSlugs = booking.services.map((service) => service.slug);
        const { barberRecord, services, durationMinutes } = await chooseSlot(session, { serviceSlugs, startsAt: start, barber, now: clock(), excludeBookingId: id });
        const nowDate = clock();
        const updated = {
          ...booking,
          barberId: String(barberRecord._id),
          barberName: barberRecord.name,
          services: services.map((service) => ({ slug: service.slug, name: service.name, durationMinutes: service.durationMinutes, priceMinorUnits: service.priceMinorUnits, currency: "USD" })),
          startsAt: start,
          endsAt: new Date(start.getTime() + durationMinutes * 60_000),
          durationMinutes,
          totalPriceMinorUnits: services.reduce((sum, service) => sum + service.priceMinorUnits, 0),
          reminderDueAt: start.getTime() - nowDate.getTime() >= REMINDER_WINDOW_MS ? new Date(start.getTime() - REMINDER_WINDOW_MS) : null,
          reminderSentAt: null,
          reminderClaimedAt: null,
          updatedAt: nowDate,
        };
        await holdSlots(session, { bookingId: id, barberId: updated.barberId, startsAt: start, durationMinutes });
        await db.collection(BOOKING_COLLECTION).updateOne({ _id: id, userId: principal.id, status: "confirmed" }, {
          $set: { barberId: updated.barberId, barberName: updated.barberName, services: updated.services, startsAt: updated.startsAt, endsAt: updated.endsAt, durationMinutes: updated.durationMinutes, totalPriceMinorUnits: updated.totalPriceMinorUnits, reminderDueAt: updated.reminderDueAt, reminderSentAt: null, reminderClaimedAt: null, updatedAt: updated.updatedAt },
        }, { session });
        await appendAuditEvent(db, bookingAudit({ actorId: principal.id, bookingId: id, action: "booking.rescheduled" }), { session });
        return publicBooking(updated);
      });
    },

    async markNoShow({ principal, bookingId }) {
      const id = asObjectId(bookingId);
      if (!id) throw new BookingError("booking_not_found", 404);
      return transaction(async (session) => {
        const booking = await db.collection(BOOKING_COLLECTION).findOne({ _id: id }, { session });
        if (!booking) throw new BookingError("booking_not_found", 404);
        if (booking.status !== "confirmed") throw new BookingError("booking_not_markable_no_show", 409);
        const nowDate = clock();
        if (nowDate.getTime() < booking.startsAt.getTime() + config.lateArrivalGraceMinutes * 60_000) {
          throw new BookingError("late_arrival_grace_not_elapsed", 409);
        }
        transitionBooking(booking.status, "no_show");
        const customer = await db.collection("user").findOne({ id: booking.userId }, { session, projection: { noShowCount: 1, adminReviewFlaggedAt: 1 } });
        if (!customer) throw new BookingError("account_unavailable", 409);
        const previousCount = Number.isInteger(customer.noShowCount) ? customer.noShowCount : 0;
        const nextCount = previousCount + 1;
        const setFields = nextCount >= config.noShowReviewThreshold
          ? { adminReviewRequired: true, adminReviewFlaggedAt: customer.adminReviewFlaggedAt || nowDate }
          : {};
        await db.collection("user").updateOne({ id: booking.userId }, { $inc: { noShowCount: 1 }, ...(Object.keys(setFields).length ? { $set: setFields } : {}) }, { session });
        await db.collection(BOOKING_COLLECTION).updateOne({ _id: id, status: "confirmed" }, { $set: { status: "no_show", noShowAt: nowDate, updatedAt: nowDate } }, { session });
        await db.collection(BOOKING_SLOT_COLLECTION).deleteMany({ bookingId: id }, { session });
        await appendAuditEvent(db, bookingAudit({ actorId: principal.id, bookingId: id, action: "booking.no_show" }), { session });
        if (previousCount < config.noShowReviewThreshold && nextCount >= config.noShowReviewThreshold) {
          await appendAuditEvent(db, {
            actorId: principal.id,
            action: "booking.customer_flagged_for_review",
            targetType: "User",
            targetId: booking.userId,
            outcome: "success",
          }, { session });
        }
        return publicBooking({ ...booking, status: "no_show", noShowAt: nowDate, updatedAt: nowDate });
      });
    },
  });
}

