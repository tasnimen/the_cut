import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: async (db, event) => db.collection("auditLog").insertOne(event) }));

const { ARCHIVE_KINDS, archiveMessage, archiveRecord, hideArchived, restoreRecord, toArchiveInfo } = await import("./archive.js");
const { createAdminService, getAdminService, listAdminServices, setAdminServiceActive, updateAdminService } = await import("./admin-services.js");
const { createAdminBarber, listAdminBarbers, updateAdminBarber, setAdminBarberActive } = await import("./admin-barbers.js");
const { listAdminPackages, setAdminPackageActive, updateAdminPackage } = await import("./admin-packages.js");

// A small in-memory database: enough Mongo for the archive code ($exists, $in, $gte, $set, $unset, a unique slug).
function fakeDb(tables) {
  const data = { service: [], barber: [], pricingPackage: [], booking: [], auditLog: [], ...tables };
  const match = (doc, filter) => Object.entries(filter).every(([key, expected]) => {
    const value = doc[key];
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if ("$exists" in expected) return (key in doc) === expected.$exists;
      if ("$in" in expected) return expected.$in.includes(value);
      if ("$gte" in expected) return value >= expected.$gte;
      if ("$ne" in expected) return value !== expected.$ne;
    }
    return value === expected;
  });
  const collection = (name) => ({
    find: (filter = {}) => ({ limit: () => ({ toArray: async () => data[name].filter((doc) => match(doc, filter)).map((doc) => ({ ...doc })) }) }),
    findOne: async (filter) => { const doc = data[name].find((item) => match(item, filter)); return doc ? { ...doc } : null; },
    countDocuments: async (filter) => data[name].filter((doc) => match(doc, filter)).length,
    insertOne: async (doc) => {
      if (doc.slug && data[name].some((item) => item.slug === doc.slug)) { const error = new Error("dup"); error.code = 11000; throw error; }
      data[name].push({ ...doc });
    },
    updateOne: async (filter, update) => {
      const doc = data[name].find((item) => match(item, filter));
      if (!doc) return { matchedCount: 0 };
      Object.assign(doc, update.$set ?? {});
      for (const key of Object.keys(update.$unset ?? {})) delete doc[key];
      return { matchedCount: 1 };
    },
    updateMany: async () => ({}),
  });
  return { data, collection };
}

const service = (extra = {}) => ({ _id: "s1", slug: "haircut", name: "Haircut", description: "x", durationMinutes: 30, priceMinorUnits: 3000, active: true, ...extra });
const barber = (extra = {}) => ({ _id: "b1", slug: "daniel-carter", name: "Daniel Carter", active: true, serviceSlugs: ["haircut"], weeklySchedule: {}, breaks: {}, daysOff: [], ...extra });
const pkg = (extra = {}) => ({ _id: "p1", slug: "basic", name: "Basic", priceMinorUnits: 2500, inclusions: [], featured: true, active: true, displayOrder: 1, bookingServiceSlugs: [], ...extra });
const NOW = new Date("2026-10-31T12:00:00Z");
const upcoming = (extra = {}) => ({ barberId: "b1", status: "confirmed", startsAt: new Date("2026-11-02T15:00:00Z"), ...extra });

describe("archiving", () => {
  it("archives a service: hidden, marked, audited, and left in the database", async () => {
    const db = fakeDb({ service: [service()] });
    expect(await archiveRecord(db, "services", "haircut", "admin-1", NOW)).toEqual({ ok: true });
    expect(db.data.service[0]).toMatchObject({ slug: "haircut", active: false, archivedAt: NOW, archivedBy: "admin-1", priceMinorUnits: 3000 });
    expect(db.data.auditLog[0]).toMatchObject({ action: "catalog.service.archived", actorId: "admin-1", targetType: "Service", targetId: "haircut", outcome: "success" });
  });

  it("archives a package and clears its featured badge", async () => {
    const db = fakeDb({ pricingPackage: [pkg()] });
    expect((await archiveRecord(db, "packages", "basic", "a", NOW)).ok).toBe(true);
    expect(db.data.pricingPackage[0]).toMatchObject({ active: false, featured: false, archivedBy: "a" });
  });

  it("archives a barber only when there is no upcoming pending or confirmed booking", async () => {
    const db = fakeDb({ barber: [barber()], booking: [upcoming(), upcoming({ status: "pending" })] });
    expect(await archiveRecord(db, "barbers", "daniel-carter", "a", NOW)).toEqual({ ok: false, error: "upcoming_bookings", count: 2 });
    expect(db.data.barber[0].archivedAt).toBeUndefined();
    expect(db.data.auditLog).toHaveLength(0);
    expect(archiveMessage("barbers", { ok: false, error: "upcoming_bookings", count: 2 }, false)).toMatch(/2 upcoming bookings/);
  });

  it("ignores bookings that do not block: past, cancelled, completed, no-show, or another barber", async () => {
    const db = fakeDb({ barber: [barber()], booking: [upcoming({ startsAt: new Date("2026-10-01T10:00:00Z") }), upcoming({ status: "cancelled" }), upcoming({ status: "completed" }), upcoming({ status: "no_show" }), upcoming({ barberId: "other" })] });
    expect((await archiveRecord(db, "barbers", "daniel-carter", "a", NOW)).ok).toBe(true);
    expect(db.data.booking).toHaveLength(5); // bookings are never touched
  });

  it("refuses a second archive, an unknown slug and an unknown kind", async () => {
    const db = fakeDb({ service: [service({ archivedAt: NOW, active: false })] });
    expect(await archiveRecord(db, "services", "haircut", "a", NOW)).toEqual({ ok: false, error: "already_archived" });
    expect(await archiveRecord(db, "services", "nope", "a", NOW)).toEqual({ ok: false, error: "not_found" });
    expect(await archiveRecord(db, "gallery", "x", "a", NOW)).toEqual({ ok: false, error: "unknown_kind" });
    expect(db.data.auditLog).toHaveLength(0);
  });
});

describe("restoring", () => {
  it("restores a record HIDDEN, clears the archive fields and audits it", async () => {
    const db = fakeDb({ service: [service({ active: false, archivedAt: NOW, archivedBy: "admin-1" })] });
    expect(await restoreRecord(db, "services", "haircut", "super-1", NOW)).toEqual({ ok: true });
    const doc = db.data.service[0];
    expect(doc.active).toBe(false);
    expect("archivedAt" in doc).toBe(false);
    expect("archivedBy" in doc).toBe(false);
    expect(db.data.auditLog[0]).toMatchObject({ action: "catalog.service.restored", actorId: "super-1" });
  });

  it("refuses to restore something that is not archived or does not exist", async () => {
    const db = fakeDb({ service: [service()] });
    expect(await restoreRecord(db, "services", "haircut", "a", NOW)).toEqual({ ok: false, error: "not_archived" });
    expect(await restoreRecord(db, "services", "nope", "a", NOW)).toEqual({ ok: false, error: "not_found" });
    expect(await restoreRecord(db, "nothing", "x", "a", NOW)).toEqual({ ok: false, error: "unknown_kind" });
  });

  it("a restored package does not come back featured", async () => {
    const db = fakeDb({ pricingPackage: [pkg()] });
    await archiveRecord(db, "packages", "basic", "a", NOW);
    await restoreRecord(db, "packages", "basic", "a", NOW);
    expect(db.data.pricingPackage[0]).toMatchObject({ active: false, featured: false });
  });
});

describe("lists, edits and reserved slugs", () => {
  it("lists only active records by default and only archived ones on request", async () => {
    const db = fakeDb({
      service: [service(), service({ _id: "s2", slug: "shave", name: "Shave", archivedAt: NOW, active: false })],
      barber: [barber(), barber({ _id: "b2", slug: "x", name: "X", archivedAt: NOW, active: false })],
      pricingPackage: [pkg(), pkg({ _id: "p2", slug: "gold", name: "Gold", archivedAt: NOW, active: false, featured: false })],
    });
    expect((await listAdminServices(db)).map((item) => item.slug)).toEqual(["haircut"]);
    expect((await listAdminServices(db, { archived: true })).map((item) => [item.slug, item.archived])).toEqual([["shave", true]]);
    expect((await listAdminBarbers(db)).map((item) => item.slug)).toEqual(["daniel-carter"]);
    expect((await listAdminBarbers(db, { archived: true })).map((item) => item.slug)).toEqual(["x"]);
    expect((await listAdminPackages(db)).map((item) => item.slug)).toEqual(["basic"]);
    expect((await listAdminPackages(db, { archived: true })).map((item) => item.slug)).toEqual(["gold"]);
  });

  it("an archived record is read-only: edits and show/hide are refused and nothing changes", async () => {
    const db = fakeDb({ service: [service({ archivedAt: NOW, active: false })], barber: [barber({ archivedAt: NOW, active: false })], pricingPackage: [pkg({ archivedAt: NOW, active: false })] });
    const fields = { name: "Changed", description: "x", durationMinutes: 30, priceMinorUnits: 1, active: true, displayOrder: 1, category: "haircut", icon: "scissors" };
    expect(await updateAdminService(db, "haircut", fields, "a")).toEqual({ ok: false, error: "archived" });
    expect(await setAdminServiceActive(db, "haircut", true, "a")).toEqual({ ok: false, error: "archived" });
    expect(await updateAdminBarber(db, "daniel-carter", { name: "Changed" }, "a")).toEqual({ ok: false, error: "archived" });
    expect(await setAdminBarberActive(db, "daniel-carter", true, "a")).toEqual({ ok: false, error: "archived" });
    expect(await updateAdminPackage(db, "basic", { name: "Changed" }, "a")).toEqual({ ok: false, error: "archived" });
    expect(await setAdminPackageActive(db, "basic", true, "a")).toEqual({ ok: false, error: "archived" });
    expect(db.data.service[0]).toMatchObject({ name: "Haircut", active: false });
    expect(db.data.barber[0]).toMatchObject({ name: "Daniel Carter", active: false });
    expect(db.data.pricingPackage[0]).toMatchObject({ name: "Basic", active: false });
    expect(db.data.auditLog).toHaveLength(0);
  });

  it("an unknown slug is still not_found, not archived", async () => {
    const db = fakeDb({ service: [service()] });
    expect(await setAdminServiceActive(db, "nope", true, "a")).toEqual({ ok: false, error: "not_found" });
  });

  it("keeps the slug of an archived record reserved", async () => {
    const db = fakeDb({ service: [service({ archivedAt: NOW, active: false })], barber: [barber({ archivedAt: NOW, active: false })] });
    expect(await createAdminService(db, { slug: "haircut", name: "Haircut again", description: "x", durationMinutes: 30, priceMinorUnits: 100, active: true }, "a")).toEqual({ ok: false, error: "slug_taken" });
    expect(await createAdminBarber(db, { slug: "daniel-carter", name: "New Daniel", active: true, serviceSlugs: [], weeklySchedule: {}, breaks: {}, daysOff: [] }, "a")).toEqual({ ok: false, error: "slug_taken" });
  });

  it("an archived record can still be read by slug and reports it is archived", async () => {
    const db = fakeDb({ service: [service({ archivedAt: NOW, active: false })] });
    expect(await getAdminService(db, "haircut")).toMatchObject({ archived: true, archivedAt: NOW.toISOString(), active: false });
  });
});

describe("public data", () => {
  it("never exposes an archived record: it counts as inactive and the date is dropped", () => {
    const docs = hideArchived([{ slug: "a", active: true, archivedAt: NOW }, { slug: "b", active: true }]);
    expect(docs).toEqual([{ slug: "a", active: false }, { slug: "b", active: true }]);
  });
  it("describes archive info for every kind", () => {
    expect(toArchiveInfo({ archivedAt: NOW })).toEqual({ archived: true, archivedAt: NOW.toISOString() });
    expect(toArchiveInfo({})).toEqual({ archived: false, archivedAt: null });
    expect(Object.keys(ARCHIVE_KINDS).sort()).toEqual(["barbers", "packages", "services"]);
  });
});
