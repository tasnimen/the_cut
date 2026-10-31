import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: async (db, event) => db.collection("auditLog").insertOne(event) }));

const { loadBookingOptions, loadDateStates, isBarberPaused } = await import("./availability.js");
const { createTimeBlock, removeTimeBlock, resolveBlockInterval, findBookingConflicts, listTimeBlocks } = await import("./blocks.js");
const { evaluateSlots } = await import("./rules.js");

// A small in-memory database for the operators the availability and block code uses.
function matchValue(actual, expected) {
  if (expected && typeof expected === "object" && !(expected instanceof Date) && !(expected instanceof ObjectId)) {
    return Object.entries(expected).every(([op, value]) => {
      if (op === "$in") return value.some((item) => (item === null ? actual == null : String(item) === String(actual)));
      if (op === "$all") return value.every((item) => (actual ?? []).includes(item));
      if (op === "$lt") return actual < value;
      if (op === "$lte") return actual <= value;
      if (op === "$gt") return actual > value;
      if (op === "$gte") return actual >= value;
      if (op === "$exists") return (actual !== undefined) === value;
      return false;
    });
  }
  if (expected === null) return actual == null;
  return String(actual) === String(expected);
}
const matches = (doc, filter) => Object.entries(filter).every(([key, expected]) => matchValue(doc[key], expected));

function fakeDb(initial = {}) {
  const data = { service: [], barber: [], bookingSlot: [], timeBlock: [], booking: [], auditLog: [], ...initial };
  const collection = (name) => {
    const rows = data[name] ?? (data[name] = []);
    return {
      find(filter = {}) {
        let result = rows.filter((row) => matches(row, filter));
        const cursor = { sort(spec) { const [[field, dir]] = Object.entries(spec); result = [...result].sort((a, b) => (a[field] > b[field] ? dir : a[field] < b[field] ? -dir : 0)); return cursor; }, limit(count) { result = result.slice(0, count); return cursor; }, async toArray() { return result.map((row) => ({ ...row })); } };
        return cursor;
      },
      async findOne(filter) { const row = rows.find((item) => matches(item, filter)); return row ? { ...row } : null; },
      async insertOne(doc) { const _id = doc._id ?? new ObjectId(); rows.push({ ...doc, _id }); return { insertedId: _id }; },
      async updateOne(filter, update) { const row = rows.find((item) => matches(item, filter)); if (!row) return { matchedCount: 0 }; Object.assign(row, update.$set ?? {}); return { matchedCount: 1 }; },
    };
  };
  return { data, collection };
}

const NOW = new Date("2027-04-05T08:00:00Z"); // Monday 04:00 in New York
const DATE = "2027-04-05";
const hours = { open: "09:00", close: "19:00" };
const week = { monday: hours, tuesday: hours, wednesday: hours, thursday: hours, friday: hours, saturday: hours, sunday: hours };
const service = (extra = {}) => ({ _id: new ObjectId(), slug: "haircut", name: "Haircut", description: "x", durationMinutes: 30, priceMinorUnits: 3500, currency: "USD", active: true, createdAt: NOW, updatedAt: NOW, ...extra });
const barber = (slug, extra = {}) => ({ _id: new ObjectId(), slug, name: slug[0].toUpperCase() + slug.slice(1), active: true, serviceSlugs: ["haircut"], weeklySchedule: week, breaks: {}, daysOff: [], ...extra });
const at = (time) => `${DATE}T${time}:00.000Z`; // helper only for readable intent
void at;

const options = (db, extra = {}) => loadBookingOptions(db, { localDate: DATE, serviceSlugs: ["haircut"], barber: "any", now: NOW, ...extra });
const gridAt = (result, label) => result.grid.find((slot) => slot.label.startsWith(label));

describe("availability: one function, every reason shown", () => {
  it("lists every time with a reason instead of hiding it, and keeps available times in slots", async () => {
    const ann = barber("ann", { breaks: { monday: { open: "12:00", close: "13:00" } } });
    const db = fakeDb({ service: [service()], barber: [ann] });
    const result = await options(db);
    expect(result.grid.length).toBeGreaterThan(result.slots.length);
    expect(result.dateState).toBe("open");
    const lunch = result.grid.find((slot) => slot.reason === "break");
    expect(lunch).toBeTruthy();
    expect(lunch.available).toBe(false);
    expect(result.slots.every((slot) => slot.barberSlug === "ann")).toBe(true);
  });

  it("marks a booked time as booked for that barber only, including the buffer", async () => {
    const ann = barber("ann");
    const bob = barber("bob");
    const day = evaluateSlots({ localDate: DATE, services: [{ durationMinutes: 30 }], barber: { ...ann, id: String(ann._id) }, now: NOW });
    const nine = day[0];
    const busy = new Set([`${String(ann._id)}:${nine.startsAt}`]);
    const db = fakeDb({ service: [service()], barber: [ann, bob], bookingSlot: [{ barberId: String(ann._id), slotStart: new Date(nine.startsAt), bookingId: new ObjectId() }] });
    const any = await options(db);
    expect(gridAt(any, nine.label).available).toBe(true); // Bob is free
    const onlyAnn = await options(db, { barber: "ann" });
    expect(onlyAnn.grid.find((slot) => slot.startsAt === nine.startsAt)).toMatchObject({ available: false, reason: "booked" });
    expect(busy.size).toBe(1);
  });

  it("a time block closes the time for one barber or for everyone, and unblocking reopens it", async () => {
    const ann = barber("ann");
    const bob = barber("bob");
    const db = fakeDb({ service: [service()], barber: [ann, bob] });
    const first = (await options(db)).slots[0];
    const blockAnn = await createTimeBlock(db, { barberId: String(ann._id), startsAt: new Date(first.startsAt), endsAt: new Date(new Date(first.startsAt).getTime() + 3_600_000), reason: "Dentist", actorId: "admin-1", now: NOW });
    expect(blockAnn.ok).toBe(true);
    const annOnly = await options(db, { barber: "ann" });
    expect(annOnly.grid.find((slot) => slot.startsAt === first.startsAt)).toMatchObject({ available: false, reason: "blocked" });
    expect((await options(db)).slots.some((slot) => slot.startsAt === first.startsAt)).toBe(true); // Bob still free
    const blockAll = await createTimeBlock(db, { barberId: null, startsAt: new Date(first.startsAt), endsAt: new Date(new Date(first.startsAt).getTime() + 3_600_000), reason: "Staff meeting", actorId: "admin-1", now: NOW });
    expect(blockAll.ok).toBe(true);
    expect((await options(db)).slots.some((slot) => slot.startsAt === first.startsAt)).toBe(false);
    expect(JSON.stringify((await options(db)).grid)).not.toMatch(/Staff meeting|Dentist/);
    await removeTimeBlock(db, { blockId: blockAll.block.id, actorId: "admin-1" });
    await removeTimeBlock(db, { blockId: blockAnn.block.id, actorId: "admin-1" });
    expect((await options(db, { barber: "ann" })).slots.some((slot) => slot.startsAt === first.startsAt)).toBe(true);
    expect(db.data.auditLog.map((entry) => entry.action)).toEqual(["availability.block_created", "availability.block_created", "availability.block_removed", "availability.block_removed"]);
  });

  it("refuses a block that overlaps a confirmed booking, lists it, and changes nothing", async () => {
    const ann = barber("ann");
    const startsAt = new Date("2027-04-05T14:00:00Z");
    const booking = { _id: new ObjectId(), barberId: String(ann._id), barberName: "Ann", customerName: "Test Customer", status: "confirmed", startsAt, endsAt: new Date("2027-04-05T14:30:00Z"), services: [{ name: "Haircut", priceMinorUnits: 3500 }] };
    const before = JSON.stringify(booking);
    const db = fakeDb({ service: [service()], barber: [ann], booking: [booking] });
    const refused = await createTimeBlock(db, { barberId: String(ann._id), startsAt: new Date("2027-04-05T13:00:00Z"), endsAt: new Date("2027-04-05T16:00:00Z"), actorId: "admin-1" });
    expect(refused).toMatchObject({ ok: false, error: "conflicts" });
    expect(refused.conflicts).toHaveLength(1);
    expect(refused.conflicts[0]).toMatchObject({ customerName: "Test Customer", status: "confirmed" });
    expect(db.data.timeBlock).toHaveLength(0);
    expect(JSON.stringify(db.data.booking[0])).toBe(before);
    // another barber's booking does not stop a block for Ann; a shop-wide block is stopped
    const other = barber("bob");
    db.data.barber.push(other);
    expect((await createTimeBlock(db, { barberId: String(other._id), startsAt: new Date("2027-04-05T13:00:00Z"), endsAt: new Date("2027-04-05T16:00:00Z"), actorId: "a" })).ok).toBe(true);
    expect((await createTimeBlock(db, { barberId: null, startsAt: new Date("2027-04-05T13:00:00Z"), endsAt: new Date("2027-04-05T16:00:00Z"), actorId: "a" })).error).toBe("conflicts");
    // cancelled bookings do not conflict
    db.data.booking[0].status = "cancelled";
    expect(await findBookingConflicts(db, { barberId: String(ann._id), startsAt: new Date("2027-04-05T13:00:00Z"), endsAt: new Date("2027-04-05T16:00:00Z") })).toEqual([]);
  });

  it("a barber who is not taking bookings is shown as paused, not hidden, and can be paused until a date", async () => {
    const ann = barber("ann", { acceptingBookings: false });
    const bob = barber("bob", { acceptingBookings: false, pausedUntil: "2027-04-06" });
    const db = fakeDb({ service: [service()], barber: [ann, bob] });
    const result = await options(db);
    expect(result.barbers.map((item) => [item.slug, item.state, item.stateLabel])).toEqual([["ann", "paused", "Not taking bookings"], ["bob", "paused", "Not taking bookings"]]);
    expect(result.slots).toEqual([]);
    expect(result.dateState).toBe("full");
    expect(isBarberPaused(bob, "2027-04-06")).toBe(true);
    expect(isBarberPaused(bob, "2027-04-07")).toBe(false);
    const later = await loadBookingOptions(db, { localDate: "2027-04-07", serviceSlugs: ["haircut"], barber: "bob", now: NOW });
    expect(later.slots.length).toBeGreaterThan(0);
  });

  it("a switched-off service cannot be booked, and a day with no free time is shown full or closed", async () => {
    const db = fakeDb({ service: [service({ bookable: false })], barber: [barber("ann")] });
    await expect(options(db)).rejects.toMatchObject({ code: "service_unavailable" });
    const closed = fakeDb({ service: [service()], barber: [barber("ann")] });
    expect((await loadBookingOptions(closed, { localDate: "2027-12-25", serviceSlugs: ["haircut"], barber: "any", now: NOW })).dateState).toBe("closed");
  });

  it("date states for the calendar come from the same rules", async () => {
    const ann = barber("ann");
    const db = fakeDb({ service: [service()], barber: [ann] });
    await createTimeBlock(db, { barberId: String(ann._id), startsAt: new Date("2027-04-06T04:00:00Z"), endsAt: new Date("2027-04-07T04:00:00Z"), actorId: "a" });
    const states = await loadDateStates(db, { serviceSlugs: ["haircut"], barber: "any", now: NOW });
    expect(states[0]).toMatchObject({ date: DATE, state: "open" });
    expect(states.find((entry) => entry.date === "2027-04-06")).toMatchObject({ state: "full", availableTimes: 0 });
    expect(states.find((entry) => entry.date === "2027-12-25")).toBeUndefined();
  });
});

describe("block intervals and DST", () => {
  it("builds a whole-day block from midnight to midnight in New York, including the 23 and 25 hour days", () => {
    const spring = resolveBlockInterval({ startDate: "2027-03-14", allDay: true });
    expect((spring.endsAt - spring.startsAt) / 3_600_000).toBe(23);
    const fall = resolveBlockInterval({ startDate: "2027-11-07", allDay: true });
    expect((fall.endsAt - fall.startsAt) / 3_600_000).toBe(25);
    const range = resolveBlockInterval({ startDate: "2027-04-05", endDate: "2027-04-07", allDay: true });
    expect((range.endsAt - range.startsAt) / 3_600_000).toBe(72);
  });

  it("rejects bad dates, a backwards range, a too long range and bad times", () => {
    expect(resolveBlockInterval({ startDate: "nope", allDay: true }).error).toBe("invalid_dates");
    expect(resolveBlockInterval({ startDate: "2027-04-05", endDate: "2027-04-04", allDay: true }).error).toBe("invalid_dates");
    expect(resolveBlockInterval({ startDate: "2027-04-05", endDate: "2027-08-05", allDay: true }).error).toBe("range_too_long");
    expect(resolveBlockInterval({ startDate: "2027-04-05", startTime: "15:00", endTime: "14:00" }).error).toBe("invalid_times");
    expect(resolveBlockInterval({ startDate: "2027-04-05", startTime: "13:00", endTime: "14:30" })).toMatchObject({ startsAt: new Date("2027-04-05T17:00:00Z"), endsAt: new Date("2027-04-05T18:30:00Z") });
  });

  it("lists active blocks only", async () => {
    const db = fakeDb({ barber: [barber("ann")] });
    const made = await createTimeBlock(db, { barberId: null, startsAt: new Date("2027-04-05T14:00:00Z"), endsAt: new Date("2027-04-05T15:00:00Z"), reason: "x".repeat(500), actorId: "a" });
    expect(made.block.reason).toHaveLength(200);
    expect(await listTimeBlocks(db, { from: NOW })).toHaveLength(1);
    await removeTimeBlock(db, { blockId: made.block.id, actorId: "a" });
    expect(await listTimeBlocks(db, { from: NOW })).toHaveLength(0);
    expect((await removeTimeBlock(db, { blockId: made.block.id, actorId: "a" })).error).toBe("not_found");
  });
});
