import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { resolveConfiguredDatabaseName } from "@/lib/db/mongo-config";
import { BOOKING_SERVICES } from "@/config/booking-services";
import {
  applyBookingSeed,
  BOOKING_SEED_OPT_IN_VALUE,
  planBookingSeed,
  validateBookingSeedGuards,
} from "@/lib/booking/seed-core";

describe("booking seed guards and idempotency", () => {
  it("resolves the explicit database override before the URI database", async () => {
    const uri = "mongodb://user:password@example.invalid/from-uri?retryWrites=true";
    expect(await resolveConfiguredDatabaseName(uri, "the_cut")).toBe("the_cut");
    expect(await resolveConfiguredDatabaseName(uri, undefined)).toBe("from-uri");
  });

  it("rejects a different database and missing explicit opt-in for writes", () => {
    expect(() => validateBookingSeedGuards({ nodeEnv: "development", databaseName: "other", optIn: BOOKING_SEED_OPT_IN_VALUE, apply: true }))
      .toThrow("the_cut or end with");
    expect(() => validateBookingSeedGuards({ nodeEnv: "development", databaseName: "the_cut", optIn: undefined, apply: true }))
      .toThrow("ALLOW_THE_CUT_BOOKING_SEED");
    expect(validateBookingSeedGuards({ nodeEnv: "development", databaseName: "the_cut", apply: false }).mode).toBe("dry-run");
    for (const name of ["selon_dev", "the_cut_test"]) {
      expect(validateBookingSeedGuards({ nodeEnv: "development", databaseName: name, apply: false }).mode).toBe("dry-run");
    }
    expect(() => validateBookingSeedGuards({ nodeEnv: "development", databaseName: "prod", apply: false })).toThrow();
  });

  it("stops on legacy service ambiguity before producing a write plan", () => {
    expect(() => planBookingSeed({
      existingServices: [{ _id: new ObjectId(), slug: "the-signature-cut", name: "The Signature Cut" }],
      existingBarbers: [],
    })).toThrow("legacy service may overlap");
  });

  it("upserts only intended services and barbers idempotently while preserving schedules", async () => {
    const collections = {
      service: [],
      barber: [{
        _id: new ObjectId(), slug: "daniel-carter", name: "Daniel Carter", active: true,
        serviceSlugs: [], weeklySchedule: { monday: { open: "08:00", close: "17:00" } },
        breaks: { monday: { open: "12:00", close: "13:00" } }, daysOff: ["2026-12-25"],
      }],
    };
    const db = { collection(name) { return {
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
        if (update.$addToSet?.serviceSlugs?.$each) {
          row.serviceSlugs = [...new Set([...(row.serviceSlugs || []), ...update.$addToSet.serviceSlugs.$each])];
        }
        return { matchedCount: 1 };
      },
    }; } };

    const runSeed = async () => {
      const plan = planBookingSeed({ existingServices: collections.service, existingBarbers: collections.barber });
      await applyBookingSeed(db, plan, new Date("2026-10-29T00:00:00.000Z"));
    };
    await runSeed();
    await runSeed();

    expect(collections.service).toHaveLength(6);
    expect(collections.barber).toHaveLength(4);
    expect(collections.service.find((row) => row.slug === "haircut")).toMatchObject({ priceMinorUnits: 2500, durationMinutes: 30 });
    expect(collections.service.find((row) => row.slug === "beard-trim")).toMatchObject({ priceMinorUnits: 1500, durationMinutes: 20 });
    expect(collections.service.map(({ slug, priceMinorUnits, durationMinutes }) => ({ slug, priceMinorUnits, durationMinutes })))
      .toEqual(BOOKING_SERVICES.map(({ slug, priceMinorUnits, durationMinutes }) => ({ slug, priceMinorUnits, durationMinutes })));
    expect(collections.barber[0].weeklySchedule.monday).toEqual({ open: "08:00", close: "17:00" });
    expect(collections.barber[0].breaks.monday).toEqual({ open: "12:00", close: "13:00" });
    expect(collections.barber[1].weeklySchedule).toEqual({});
  });
});
