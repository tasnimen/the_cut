import { describe, expect, it } from "vitest";
import { createAdminBarber, getAdminBarber, listAdminBarbers, setAdminBarberActive, updateAdminBarber } from "./admin-barbers.js";

function fakeDb(initial = []) {
  const data = { barber: initial.map((doc) => ({ ...doc })), auditLog: [] };
  const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => (value && typeof value === "object" && "$exists" in value ? (key in doc) === value.$exists : doc[key] === value));
  const collection = (name) => ({
    find: (filter = {}) => ({ limit: () => ({ toArray: async () => data[name].filter((doc) => matches(doc, filter)).map((doc) => ({ ...doc })) }) }),
    findOne: async (filter) => { const doc = data[name].find((item) => matches(item, filter)); return doc ? { ...doc } : null; },
    insertOne: async (doc) => {
      if (name === "barber" && data.barber.some((item) => item.slug === doc.slug)) { const error = new Error("dup"); error.code = 11000; throw error; }
      data[name].push({ ...doc });
    },
    updateOne: async (filter, update) => {
      const doc = data[name].find((item) => matches(item, filter));
      if (!doc) return { matchedCount: 0 };
      Object.assign(doc, update.$set);
      return { matchedCount: 1 };
    },
  });
  return { data, collection };
}

const legacy = { slug: "daniel-carter", name: "Daniel Carter", active: true, serviceSlugs: ["haircut"], weeklySchedule: {}, breaks: {}, daysOff: [], createdAt: new Date("2026-01-01") };
const fields = { name: "Daniel Carter", active: true, publicProfile: true, role: "Master Barber", focus: "Classic", displayOrder: 1, serviceSlugs: ["haircut", "shave"], weeklySchedule: { monday: { open: "09:00", close: "19:00" } }, breaks: { monday: { open: "12:00", close: "13:00" } }, daysOff: ["2027-01-05"] };

describe("admin barbers repository", () => {
  it("lists legacy seeded barbers with safe defaults and no internal fields", async () => {
    const db = fakeDb([legacy, { ...legacy, slug: "james-miller", name: "James Miller", weeklySchedule: { monday: { open: "bad", close: "19:00" } } }]);
    const list = await listAdminBarbers(db);
    expect(list.map((barber) => [barber.slug, barber.displayOrder, barber.publicProfile])).toEqual([["daniel-carter", 1, false], ["james-miller", 2, false]]);
    expect(list[1].weeklySchedule).toEqual({});
    expect(list[0]).not.toHaveProperty("_id");
  });

  it("creates, rejects a duplicate slug and audits", async () => {
    const db = fakeDb();
    expect(await createAdminBarber(db, { slug: "new-barber", ...fields }, "admin-1")).toEqual({ ok: true });
    expect(await createAdminBarber(db, { slug: "new-barber", ...fields }, "admin-1")).toEqual({ ok: false, error: "slug_taken" });
    expect(db.data.auditLog).toHaveLength(1);
    expect(db.data.auditLog[0]).toMatchObject({ action: "catalog.barber.created", targetId: "new-barber" });
  });

  it("replaces the schedule wholesale (so removed days disappear), keeps the slug and createdAt, audits changes", async () => {
    const db = fakeDb([{ ...legacy, weeklySchedule: { monday: { open: "09:00", close: "17:00" }, tuesday: { open: "09:00", close: "17:00" } } }]);
    const result = await updateAdminBarber(db, "daniel-carter", fields, "admin-1");
    expect(result.ok).toBe(true);
    expect(Object.keys(db.data.barber[0].weeklySchedule)).toEqual(["monday"]);
    expect(db.data.barber[0]).toMatchObject({ slug: "daniel-carter", publicProfile: true, daysOff: ["2027-01-05"] });
    expect(db.data.barber[0].createdAt).toEqual(new Date("2026-01-01"));
    expect(db.data.auditLog[0].details).toMatchObject({ weeklySchedule: "changed", services: "1->2", publicProfile: "false->true" });
  });

  it("reports not_found, and toggles active without deleting", async () => {
    const db = fakeDb([legacy]);
    expect(await updateAdminBarber(db, "nope", fields, "admin-1")).toEqual({ ok: false, error: "not_found" });
    expect(await setAdminBarberActive(db, "nope", false, "admin-1")).toEqual({ ok: false, error: "not_found" });
    expect(await setAdminBarberActive(db, "daniel-carter", false, "admin-1")).toEqual({ ok: true });
    expect((await getAdminBarber(db, "daniel-carter")).active).toBe(false);
    expect(db.data.barber).toHaveLength(1);
    expect(db.data.auditLog.map((event) => event.action)).toEqual(["catalog.barber.deactivated"]);
  });
});
