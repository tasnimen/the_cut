import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";

// OPT-IN live test (skipped unless RACE_TEST=1): many customers book the same time at once against a real MongoDB with
// transactions. Exactly one must win. It only ever touches the throw-away database `the_cut_test` (it refuses any other
// name), creates clearly named fixtures ("race-test-...") and removes them again. Run it with:
//   RACE_TEST=1 npx vitest run src/lib/booking/race.live.test.js   (PowerShell: $env:RACE_TEST=1)
const ENABLED = process.env.RACE_TEST === "1";
const DATABASE = "the_cut_test";
const CUSTOMERS = 8;

describe.skipIf(!ENABLED)("booking race on a real database", () => {
  it("lets exactly one of many parallel bookings win the same time, and honours a block", async () => {
    const { loadSeedEnvironment } = await import("./load-seed-environment.js");
    loadSeedEnvironment(process.cwd(), "development");
    const { MongoClient } = await import("mongodb");
    const { createBookingRepository } = await import("./repository.js");
    const { ensureApplicationIndexes } = await import("@/lib/db/mongo");
    const { createTimeBlock } = await import("./blocks.js");
    const { BOOKING_CONFIG } = await import("@/config/booking");
    const { businessDate, addLocalCalendarDays } = await import("./time.js");

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(DATABASE);
    if (db.databaseName !== DATABASE) throw new Error("refusing to run outside the throw-away database");
    await ensureApplicationIndexes(db);

    const tag = `race-test-${Date.now()}`;
    const week = Object.fromEntries(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => [day, { open: "09:00", close: "19:00" }]));
    const now = new Date();
    const barberId = new ObjectId();
    const userIds = Array.from({ length: CUSTOMERS }, () => new ObjectId());
    let bookingIds = [];
    try {
      await db.collection("service").insertOne({ slug: tag, name: "Race Test Cut", description: "x", durationMinutes: 30, priceMinorUnits: 3000, currency: "USD", active: true, createdAt: now, updatedAt: now });
      await db.collection("barber").insertOne({ _id: barberId, slug: tag, name: "Race Test Barber", active: true, serviceSlugs: [tag], weeklySchedule: week, breaks: {}, daysOff: [], createdAt: now, updatedAt: now });
      await db.collection("user").insertMany(userIds.map((_id, index) => ({ _id, name: `Race Test ${index}`, email: `race-test+${index}@example.com` })));

      const repository = createBookingRepository({ client, db });
      let localDate = addLocalCalendarDays(businessDate(now, BOOKING_CONFIG.timeZone), 3);
      let slot;
      for (let tries = 0; tries < 7 && !slot; tries += 1) {
        slot = (await repository.availability({ localDate, serviceSlugs: [tag], barber: tag })).slots[0];
        if (!slot) localDate = addLocalCalendarDays(localDate, 1);
      }
      expect(slot, "a free time to race for").toBeTruthy();

      const results = await Promise.allSettled(userIds.map((id) => repository.create({ principal: { id: String(id) }, user: { name: "x" }, serviceSlugs: [tag], startsAt: slot.startsAt, barber: tag })));
      const winners = results.filter((result) => result.status === "fulfilled");
      expect(winners).toHaveLength(1);
      bookingIds = winners.map((result) => new ObjectId(result.value.id));
      for (const loser of results.filter((result) => result.status === "rejected")) expect(["slot_unavailable"]).toContain(loser.reason.code);

      // The same time is now closed for everyone else, and a block over the existing booking is refused and changes nothing.
      const after = await repository.availability({ localDate, serviceSlugs: [tag], barber: tag });
      expect(after.grid.find((item) => item.startsAt === slot.startsAt)).toMatchObject({ available: false, reason: "booked" });
      const refused = await createTimeBlock(db, { barberId: String(barberId), startsAt: new Date(slot.startsAt), endsAt: new Date(new Date(slot.startsAt).getTime() + 3_600_000), actorId: "race-test" });
      expect(refused).toMatchObject({ ok: false, error: "conflicts" });
      expect(await db.collection("booking").countDocuments({ _id: { $in: bookingIds }, status: "confirmed" })).toBe(1);
    } finally {
      await db.collection("bookingSlot").deleteMany({ barberId: String(barberId) });
      await db.collection("booking").deleteMany({ barberId: String(barberId) });
      await db.collection("bookingUserLock").deleteMany({ userId: { $in: userIds.map(String) } });
      await db.collection("timeBlock").deleteMany({ barberId: String(barberId) });
      await db.collection("auditLog").deleteMany({ actorId: { $in: userIds.map(String) } });
      await db.collection("user").deleteMany({ _id: { $in: userIds } });
      await db.collection("barber").deleteMany({ _id: barberId });
      await db.collection("service").deleteMany({ slug: tag });
      await client.close();
    }
  }, 60_000);
});
