import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { BOOKING_CONFIG } from "@/config/booking";
import { CreateBookingSchema } from "@/lib/booking/booking-model";
import { createBookingRepository } from "@/lib/booking/repository";

function matches(document, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((clause) => matches(document, clause));
    const actual = document[key];
    if (expected && typeof expected === "object" && !(expected instanceof Date) && !(expected instanceof ObjectId)) {
      if ("$in" in expected && !expected.$in.some((value) => String(value) === String(actual))) return false;
      if ("$all" in expected && !expected.$all.every((value) => actual?.includes(value))) return false;
      if ("$gte" in expected && !(actual >= expected.$gte)) return false;
      if ("$lt" in expected && !(actual < expected.$lt)) return false;
      if ("$lte" in expected && !(actual <= expected.$lte)) return false;
      if ("$regex" in expected && !new RegExp(expected.$regex, expected.$options).test(String(actual ?? ""))) return false;
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
        const result = rows.filter((row) => matches(row, query));
        let skipped = 0;
        let max = Infinity;
        return {
          sort() { return this; }, skip(count) { skipped = count; return this; }, limit(count) { max = count; return this; },
          async toArray() { return result.slice(skipped, skipped + max); },
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

describe("admin booking changes", () => {
  const admin = { id: "admin-1" };
  function seeded(status = "confirmed", startsAt = "2027-04-05T14:00:00Z") {
    const { db, client, data } = bookingDb();
    const id = new ObjectId();
    data.booking.push({ _id: id, userId: "customer-1", customerName: "Customer", status, startsAt: new Date(startsAt), endsAt: new Date("2027-04-05T14:30:00Z"), createdAt: new Date(), services: [], barberId: "b", barberName: "Alex", totalPriceMinorUnits: 2500, currency: "USD" });
    data.bookingSlot.push({ bookingId: id, barberId: "b", slotStart: new Date(startsAt) });
    return { db, client, data, id: String(id) };
  }

  it("lists one business day without exposing the customer's user id", async () => {
    const { db, client, data } = seeded();
    data.booking.push({ _id: new ObjectId(), userId: "x", customerName: "Other day", status: "confirmed", startsAt: new Date("2027-04-06T14:00:00Z"), endsAt: new Date("2027-04-06T14:30:00Z"), createdAt: new Date(), services: [], barberId: "b", barberName: "Alex", totalPriceMinorUnits: 1, currency: "USD" });
    const repository = createBookingRepository({ client, db });
    const list = await repository.adminListDay({ localDate: "2027-04-05" });
    expect(list.map((booking) => booking.customerName)).toEqual(["Customer"]);
    expect(JSON.stringify(list)).not.toMatch(/customer-1/);
    await expect(repository.adminListDay({ localDate: "nope" })).rejects.toMatchObject({ status: 400 });
  });

  it("cancels any customer's booking, frees its slots, audits it and returns the customer id", async () => {
    const { db, client, data, id } = seeded();
    const repository = createBookingRepository({ client, db, clock: () => new Date("2027-04-05T13:00:00Z") });
    const result = await repository.adminChangeStatus({ principal: admin, bookingId: id, to: "cancelled" });
    expect(result.customerId).toBe("customer-1");
    expect(data.booking[0].status).toBe("cancelled");
    expect(data.bookingSlot).toHaveLength(0);
    expect(data.auditLog[0]).toMatchObject({ actorId: "admin-1", action: "booking.cancelled_by_admin" });
  });

  it("refuses to complete a booking that has not started, then completes it afterwards", async () => {
    const { db, client, data, id } = seeded();
    let now = new Date("2027-04-05T13:00:00Z");
    const repository = createBookingRepository({ client, db, clock: () => now });
    await expect(repository.adminChangeStatus({ principal: admin, bookingId: id, to: "completed" })).rejects.toMatchObject({ code: "booking_status_change_not_allowed" });
    now = new Date("2027-04-05T14:20:00Z");
    await repository.adminChangeStatus({ principal: admin, bookingId: id, to: "completed" });
    expect(data.booking[0].status).toBe("completed");
  });

  it("does not change finished bookings or unknown ids", async () => {
    const { db, client, id } = seeded("cancelled");
    const repository = createBookingRepository({ client, db, clock: () => new Date("2027-04-05T15:00:00Z") });
    await expect(repository.adminChangeStatus({ principal: admin, bookingId: id, to: "completed" })).rejects.toMatchObject({ code: "booking_status_change_not_allowed" });
    await expect(repository.adminChangeStatus({ principal: admin, bookingId: String(new ObjectId()), to: "cancelled" })).rejects.toMatchObject({ code: "booking_not_found" });
    await expect(repository.adminChangeStatus({ principal: admin, bookingId: "bad", to: "cancelled" })).rejects.toMatchObject({ code: "booking_not_found" });
  });

  it("marks a no-show through the existing rule and counts it against the customer", async () => {
    const { db, client, data, id } = seeded();
    const repository = createBookingRepository({ client, db, clock: () => new Date("2027-04-05T14:30:00Z") });
    const result = await repository.adminChangeStatus({ principal: admin, bookingId: id, to: "no_show" });
    expect(result.customerId).toBe("customer-1");
    expect(data.booking[0].status).toBe("no_show");
  });
});

describe("admin booking search", () => {
  function many(count) {
    const { db, client, data } = bookingDb();
    const barberA = String(data.barber[0]._id);
    for (let index = 0; index < count; index += 1) {
      data.booking.push({ _id: new ObjectId(), userId: "u" + index, customerName: index === 3 ? "Sam (VIP)" : "Customer " + index, phoneE164: "+1555010" + String(1000 + index), status: index % 2 ? "cancelled" : "confirmed", startsAt: new Date(Date.UTC(2027, 3, 5, 14, index)), endsAt: new Date(Date.UTC(2027, 3, 5, 14, index + 30)), createdAt: new Date(), services: [], barberId: index < 5 ? barberA : "other", barberName: "Alex", totalPriceMinorUnits: 2500, currency: "USD" });
    }
    return { repository: createBookingRepository({ client, db }), barberA, data };
  }
  const base = { q: "", status: "", barber: "", from: "", to: "", page: 1 };

  it("pages results and reports the total", async () => {
    const { repository } = many(30);
    const first = await repository.adminSearch({ filters: base });
    expect(first).toMatchObject({ total: 30, pages: 2, page: 1, pageSize: 25 });
    expect(first.bookings).toHaveLength(25);
    const second = await repository.adminSearch({ filters: { ...base, page: 2 } });
    expect(second.bookings).toHaveLength(5);
  });

  it("filters by status, barber and date range", async () => {
    const { repository, barberA } = many(10);
    expect((await repository.adminSearch({ filters: { ...base, status: "cancelled" } })).total).toBe(5);
    expect((await repository.adminSearch({ filters: { ...base, barber: barberA } })).total).toBe(5);
    expect((await repository.adminSearch({ filters: { ...base, from: "2027-04-06" } })).total).toBe(0);
    expect((await repository.adminSearch({ filters: { ...base, from: "2027-04-05", to: "2027-04-05" } })).total).toBe(10);
  });

  it("searches name (case-insensitive, special characters safe), phone and booking id without exposing user ids", async () => {
    const { repository, data } = many(10);
    expect((await repository.adminSearch({ filters: { ...base, q: "sam (v" } })).bookings.map((b) => b.customerName)).toEqual(["Sam (VIP)"]);
    expect((await repository.adminSearch({ filters: { ...base, q: ".*" } })).total).toBe(0);
    expect((await repository.adminSearch({ filters: { ...base, q: "555 0101002" } })).total).toBe(1);
    const found = await repository.adminSearch({ filters: { ...base, q: String(data.booking[4]._id) } });
    expect(found.total).toBe(1);
    expect(JSON.stringify(found)).not.toMatch(/"u4"/);
  });

  it("lists barbers for the filter", async () => {
    const { repository } = many(1);
    expect(await repository.adminBarberOptions()).toEqual([{ id: expect.any(String), name: "Alex" }]);
  });
});
