import { describe, expect, it } from "vitest";
import { PRICING_PACKAGES } from "../../config/pricing-packages.js";
import { createAdminPackage, importDefaultPackages, listAdminPackages, setAdminPackageActive, updateAdminPackage } from "./admin-packages.js";

function fakeDb(initial = []) {
  const data = { pricingPackage: initial.map((doc) => ({ ...doc })), auditLog: [] };
  const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => (value && typeof value === "object" && "$ne" in value ? doc[key] !== value.$ne : value && typeof value === "object" && "$exists" in value ? (key in doc) === value.$exists : doc[key] === value));
  const collection = (name) => ({
    find: (filter = {}) => ({ limit: () => ({ toArray: async () => data[name].filter((doc) => matches(doc, filter)).map((doc) => ({ ...doc })) }) }),
    findOne: async (filter) => { const doc = data[name].find((item) => matches(item, filter)); return doc ? { ...doc } : null; },
    countDocuments: async (filter) => data[name].filter((doc) => matches(doc, filter)).length,
    insertOne: async (doc) => {
      if (name === "pricingPackage" && data.pricingPackage.some((item) => item.slug === doc.slug)) { const error = new Error("dup"); error.code = 11000; throw error; }
      data[name].push({ ...doc });
    },
    insertMany: async (docs) => { data[name].push(...docs.map((doc) => ({ ...doc }))); },
    updateOne: async (filter, update) => {
      const doc = data[name].find((item) => matches(item, filter));
      if (!doc) return { matchedCount: 0 };
      Object.assign(doc, update.$set);
      return { matchedCount: 1 };
    },
    updateMany: async (filter, update) => {
      const docs = data[name].filter((item) => matches(item, filter));
      docs.forEach((doc) => Object.assign(doc, update.$set));
      return { matchedCount: docs.length };
    },
  });
  return { data, collection };
}

const fields = { name: "Gold", note: "n", priceMinorUnits: 9000, inclusions: ["Haircut"], featured: true, active: true, displayOrder: 4, bookingServiceSlugs: ["haircut"] };

describe("admin packages repository", () => {
  it("imports the built-in packages only into an empty collection", async () => {
    const db = fakeDb();
    expect(await importDefaultPackages(db, PRICING_PACKAGES, "admin-1")).toEqual({ ok: true, count: 3 });
    expect((await listAdminPackages(db)).map((pkg) => [pkg.slug, pkg.priceMinorUnits, pkg.featured])).toEqual([["basic", 2500, false], ["standard", 4000, true], ["premium", 6000, false]]);
    expect(db.data.auditLog[0]).toMatchObject({ action: "catalog.package.imported", details: { count: "3" } });
    expect(await importDefaultPackages(db, PRICING_PACKAGES, "admin-1")).toEqual({ ok: false, error: "not_empty" });
    expect(db.data.pricingPackage).toHaveLength(3);
  });

  it("creates a package, rejects a duplicate slug, and keeps only one featured", async () => {
    const db = fakeDb();
    await importDefaultPackages(db, PRICING_PACKAGES, "admin-1");
    expect(await createAdminPackage(db, { slug: "gold", ...fields }, "admin-1")).toEqual({ ok: true });
    expect(db.data.pricingPackage.filter((pkg) => pkg.featured).map((pkg) => pkg.slug)).toEqual(["gold"]);
    expect(await createAdminPackage(db, { slug: "gold", ...fields }, "admin-1")).toEqual({ ok: false, error: "slug_taken" });
    expect(db.data.pricingPackage.find((pkg) => pkg.slug === "gold")).toMatchObject({ currency: "USD" });
  });

  it("updates, audits changes, and moves the featured badge", async () => {
    const db = fakeDb();
    await importDefaultPackages(db, PRICING_PACKAGES, "admin-1");
    const result = await updateAdminPackage(db, "premium", { name: "Premium", note: "The full experience.", priceMinorUnits: 6500, inclusions: [...PRICING_PACKAGES[2].inclusions], featured: true, active: true, displayOrder: 3, bookingServiceSlugs: [...PRICING_PACKAGES[2].bookingServiceSlugs] }, "admin-1");
    expect(result).toEqual({ ok: true, changed: 2 });
    expect(db.data.pricingPackage.filter((pkg) => pkg.featured).map((pkg) => pkg.slug)).toEqual(["premium"]);
    expect(db.data.auditLog.at(-1).details).toMatchObject({ priceMinorUnits: "6000->6500", featured: "false->true" });
  });

  it("reports not_found and toggles active without deleting", async () => {
    const db = fakeDb();
    await importDefaultPackages(db, PRICING_PACKAGES, "admin-1");
    expect(await updateAdminPackage(db, "nope", fields, "admin-1")).toEqual({ ok: false, error: "not_found" });
    expect(await setAdminPackageActive(db, "nope", false, "admin-1")).toEqual({ ok: false, error: "not_found" });
    expect(await setAdminPackageActive(db, "basic", false, "admin-1")).toEqual({ ok: true });
    expect(db.data.pricingPackage).toHaveLength(3);
    expect(db.data.pricingPackage.find((pkg) => pkg.slug === "basic").active).toBe(false);
  });
});
