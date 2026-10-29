import { describe, expect, it } from "vitest";
import { createAdminService, getAdminService, listAdminServices, setAdminServiceActive, updateAdminService } from "./admin-services.js";

function fakeDb(initial = []) {
  const data = { service: initial.map((doc) => ({ ...doc })), auditLog: [] };
  const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => doc[key] === value);
  const collection = (name) => ({
    find: (filter = {}) => ({ limit: () => ({ toArray: async () => data[name].filter((doc) => matches(doc, filter)).map((doc) => ({ ...doc })) }) }),
    findOne: async (filter) => { const doc = data[name].find((item) => matches(item, filter)); return doc ? { ...doc } : null; },
    insertOne: async (doc) => {
      if (name === "service" && data.service.some((item) => item.slug === doc.slug)) { const error = new Error("dup"); error.code = 11000; throw error; }
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

const seeded = { slug: "haircut", name: "Haircut", description: "A clean cut.", durationMinutes: 30, priceMinorUnits: 2500, active: true };
const fields = { name: "Haircut", description: "A clean cut.", durationMinutes: 30, priceMinorUnits: 3000, active: true, displayOrder: 1, category: "haircut", icon: "scissors" };

describe("admin services repository", () => {
  it("lists legacy documents with display fields filled in and sorted", async () => {
    const db = fakeDb([{ ...seeded }, { slug: "shave", name: "Shave", durationMinutes: 30, priceMinorUnits: 2000 }]);
    const list = await listAdminServices(db);
    expect(list.map((item) => [item.slug, item.displayOrder, item.category, item.icon])).toEqual([["haircut", 1, "haircut", "scissors"], ["shave", 3, "shave", "razor"]]);
    expect(list[0]).not.toHaveProperty("_id");
  });

  it("creates a service, rejects a duplicate slug, and writes an audit event", async () => {
    const db = fakeDb();
    const data = { slug: "hot-towel", ...fields, name: "Hot Towel" };
    expect(await createAdminService(db, data, "admin-1")).toEqual({ ok: true });
    expect(db.data.service[0]).toMatchObject({ slug: "hot-towel", currency: "USD", priceMinorUnits: 3000 });
    expect(db.data.auditLog[0]).toMatchObject({ action: "catalog.service.created", actorId: "admin-1", targetId: "hot-towel", outcome: "success" });
    expect(await createAdminService(db, data, "admin-1")).toEqual({ ok: false, error: "slug_taken" });
    expect(db.data.auditLog).toHaveLength(1);
  });

  it("updates only the allowed fields, keeps the slug, and audits what changed", async () => {
    const db = fakeDb([{ ...seeded, createdAt: new Date("2026-01-01") }]);
    const result = await updateAdminService(db, "haircut", fields, "admin-1");
    expect(result).toEqual({ ok: true, changed: 1 });
    expect(db.data.service[0]).toMatchObject({ slug: "haircut", priceMinorUnits: 3000, displayOrder: 1, category: "haircut", icon: "scissors" });
    expect(db.data.service[0].createdAt).toEqual(new Date("2026-01-01"));
    expect(db.data.auditLog[0].details).toMatchObject({ priceMinorUnits: "2500->3000" });
  });

  it("reports not_found for unknown slugs without writing", async () => {
    const db = fakeDb([{ ...seeded }]);
    expect(await updateAdminService(db, "nope", fields, "admin-1")).toEqual({ ok: false, error: "not_found" });
    expect(await setAdminServiceActive(db, "nope", false, "admin-1")).toEqual({ ok: false, error: "not_found" });
    expect(db.data.auditLog).toHaveLength(0);
  });

  it("deactivates and reactivates instead of deleting", async () => {
    const db = fakeDb([{ ...seeded }]);
    expect(await setAdminServiceActive(db, "haircut", false, "admin-1")).toEqual({ ok: true });
    expect(db.data.service[0].active).toBe(false);
    expect((await getAdminService(db, "haircut")).active).toBe(false);
    await setAdminServiceActive(db, "haircut", true, "admin-1");
    expect(db.data.auditLog.map((event) => event.action)).toEqual(["catalog.service.deactivated", "catalog.service.activated"]);
  });
});
