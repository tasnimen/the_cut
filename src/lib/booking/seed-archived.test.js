import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { applyBookingSeed, planBookingSeed } from "@/lib/booking/seed-core";

// The seed script must never bring an archived service or barber back (unit D2a).
function makeDb(collections) {
  return { collection: (name) => ({
    async updateOne(filter, update, options = {}) {
      const rows = collections[name];
      let row = rows.find((item) => item.slug === filter.slug || (filter._id && String(item._id) === String(filter._id)));
      if (!row && options.upsert) {
        row = { ...filter, ...structuredClone(update.$setOnInsert), _id: new ObjectId() };
        rows.push(row);
        return { upsertedCount: 1 };
      }
      if (!row) return { matchedCount: 0 };
      if (update.$set) Object.assign(row, update.$set);
      if (update.$addToSet?.serviceSlugs?.$each) row.serviceSlugs = [...new Set([...(row.serviceSlugs || []), ...update.$addToSet.serviceSlugs.$each])];
      return { matchedCount: 1 };
    },
  }) };
}

describe("seed and archived records", () => {
  it("leaves an archived service and an archived barber exactly as they are", async () => {
    const collections = { service: [], barber: [] };
    const db = makeDb(collections);
    const run = async () => applyBookingSeed(db, planBookingSeed({ existingServices: collections.service, existingBarbers: collections.barber }), new Date("2026-10-29T00:00:00Z"));
    await run();

    const archivedAt = new Date("2026-10-30T00:00:00Z");
    const service = collections.service.find((row) => row.slug === "haircut");
    const barber = collections.barber[0];
    Object.assign(service, { active: false, archivedAt, priceMinorUnits: 9999 });
    Object.assign(barber, { active: false, archivedAt, serviceSlugs: ["haircut"] });
    const before = structuredClone({ service, barber });

    const plan = planBookingSeed({ existingServices: collections.service, existingBarbers: collections.barber });
    expect(plan.services.find((action) => action.service.slug === "haircut").kind).toBe("skip (archived)");
    expect(plan.barbers.find((action) => action.record?.slug === barber.slug).kind).toBe("skip (archived)");
    await run();

    expect(collections.service.find((row) => row.slug === "haircut")).toEqual(before.service);
    expect(collections.barber[0]).toEqual(before.barber);
    expect(collections.service).toHaveLength(6); // no duplicate was inserted for the archived slug
    expect(collections.barber).toHaveLength(4);
  });
});
