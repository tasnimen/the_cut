import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { BOOKING_CONFIG } from "@/config/booking";
import { CreateBookingSchema } from "@/lib/booking/booking-model";
import { createBookingRepository } from "@/lib/booking/repository";

function matches(document, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    const actual = document[key];
    if (expected && typeof expected === "object" && !(expected instanceof Date) && !(expected instanceof ObjectId)) {
      if ("$in" in expected && !expected.$in.some((value) => String(value) === String(actual))) return false;
      if ("$all" in expected && !expected.$all.every((value) => actual?.includes(value))) return false;
      if ("$gte" in expected && !(actual >= expected.$gte)) return false;
      if ("$lt" in expected && !(actual < expected.$lt)) return false;
      if ("$lte" in expected && !(actual <= expected.$lte)) return false;
      return true;
    }
    return String(actual) === String(expected);
  });
}

function bookingDb() {
  const barberId = new ObjectId();
  const data = {
    service: [{ slug: "haircut", name: "Haircut", durationMinutes: 30, priceMinorUnits: 2500, currency: "USD", active: true }],
    barber: [{ _id: barberId, slug: "alex", name: "Alex", active: true, serviceSlugs: ["haircut"], weeklySchedule: { monday: { open: "09:00", close: "19:00" } }, breaks: {}, daysOff: [] }],
    booking: [], bookingSlot: [], auditLog: [], user: [{ id: "customer-1", name: "Customer", noShowCount: 0 }],
  };
  const uniqueSlots = new Set();
  const db = { collection(name) {
    const rows = data[name] || (data[name] = []);
    return {
      find(query) {
        let result = rows.filter((row) => matches(row, query));
        return {
          sort() { return this; }, skip() { return this; }, limit() { return this; },
          async toArray() { return result; },
        };
      },
      async countDocuments(query) { return rows.filter((row) => matches(row, query)).length; },
      async findOne(query) { return rows.find((row) => matches(row, query)) || null; },
      async insertOne(record) { rows.push(record); return { insertedId: record._id }; },
      async insertMany(records) {
        for (const record of records) {
          const key = `${record.barberId}:${record.slotStart.toISOString()}`;
          if (uniqueSlots.has(key)) { const error = new Error("duplicate"); error.code = 11000; throw error; }
          uniqueSlots.add(key);
        }
        rows.push(...records);
        return { insertedCount: records.length };
      },
      async deleteMany(query) { data[name] = rows.filter((row) => !matches(row, query)); return { deletedCount: 0 }; },
      async updateOne(query, update) {
        const row = rows.find((item) => matches(item, query));
        if (!row) return { matchedCount: 0 };
        if (update.$set) Object.assign(row, update.$set);
        if (update.$inc) for (const [field, value] of Object.entries(update.$inc)) row[field] = (row[field] || 0) + value;
        return { matchedCount: 1 };
      },
    };
  } };
  const client = { startSession: () => ({ withTransaction: (callback) => callback({}), endSession: async () => {} }) };
  return { db, client, data };
}

describe("booking repository boundaries", () => {
  it("claims overlapping slots atomically and rejects a concurrent duplicate", async () => {
    const { db, client, data } = bookingDb();
    const repository = createBookingRepository({ client, db, clock: () => new Date("2027-04-05T12:00:00Z") });
    const args = { principal: { id: "customer-1" }, user: { name: "Customer" }, serviceSlugs: ["haircut"], startsAt: "2027-04-05T14:00:00.000Z" };
    const results = await Promise.allSettled([repository.create(args), repository.create(args)]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((item) => item.status === "rejected").map((item) => item.reason.code)).toEqual(["slot_just_taken"]);
    expect(data.booking).toHaveLength(1);
    expect(data.bookingSlot).toHaveLength(3);
    const successfulBooking = data.booking[0];
    expect(successfulBooking.status).toBe("confirmed");
    expect(successfulBooking.totalPriceMinorUnits).toBe(2500);
    expect(successfulBooking.services[0].priceMinorUnits).toBe(2500);

    // A current catalog edit does not mutate the historical booking snapshot.
    data.service[0].priceMinorUnits = 2700;
    expect(successfulBooking.services[0].priceMinorUnits).toBe(2500);
  });

  it.each([null, 0, -1, 12.5, Number.NaN])("blocks confirmation for invalid trusted price %s", async (priceMinorUnits) => {
    const { db, client, data } = bookingDb();
    data.service[0].priceMinorUnits = priceMinorUnits;
    const repository = createBookingRepository({ client, db, clock: () => new Date("2027-04-05T12:00:00Z") });
    await expect(repository.create({ principal: { id: "customer-1" }, user: { name: "Customer" }, serviceSlugs: ["haircut"], startsAt: "2027-04-05T14:00:00.000Z" }))
      .rejects.toMatchObject({ code: "price_not_configured", status: 409 });
    expect(data.booking).toHaveLength(0);
  });

  it("rejects client-supplied price and duration fields", () => {
    const parsed = CreateBookingSchema.safeParse({
      serviceSlugs: ["haircut"], startsAt: "2027-04-05T14:00:00.000Z", barber: "any", priceMinorUnits: 1, durationMinutes: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("does not return another customer's booking on an owner-scoped cancellation", async () => {
    const { db, client, data } = bookingDb();
    const bookingId = new ObjectId();
    data.booking.push({ _id: bookingId, userId: "someone-else", status: "confirmed", startsAt: new Date("2027-04-10T14:00:00Z") });
    const repository = createBookingRepository({ client, db, clock: () => new Date("2027-04-01T12:00:00Z") });
    await expect(repository.cancel({ principal: { id: "customer-1" }, bookingId: String(bookingId) }))
      .rejects.toMatchObject({ code: "booking_not_found", status: 404 });
  });

  it("enforces the active booking cap before claiming a new slot", async () => {
    const { db, client, data } = bookingDb();
    data.booking.push({ _id: new ObjectId(), userId: "customer-1", status: "confirmed" });
    const repository = createBookingRepository({ client, db, config: { ...BOOKING_CONFIG, maximumActiveBookingsPerUser: 1 }, clock: () => new Date("2027-04-05T12:00:00Z") });
    await expect(repository.create({ principal: { id: "customer-1" }, user: { name: "Customer" }, serviceSlugs: ["haircut"], startsAt: "2027-04-05T14:00:00.000Z" }))
      .rejects.toMatchObject({ code: "active_booking_limit", status: 409 });
    expect(data.bookingSlot).toHaveLength(0);
  });
});
