import { describe, expect, it, vi } from "vitest";
import { normalizeSlotOverrides } from "./slot-input.js";
import { resolveImage } from "./resolve.js";
import { clearSlotOverride, setSlotOverride } from "./admin-slots.js";

vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: async (db, event) => db.collection("auditLog").insertOne(event) }));

const url = (name) => `https://res.cloudinary.com/demo/image/upload/v1/the-cut/slots/${name}.webp`;

describe("normalizeSlotOverrides", () => {
  it("keeps known slots with trusted addresses and drops everything else", () => {
    const result = normalizeSlotOverrides([
      { slot: "about-story", secureUrl: url("a"), alt: "The shop", width: 1000, height: 700 },
      { slot: "not-a-slot", secureUrl: url("b") },
      { slot: "hero-gallery", secureUrl: "https://evil.example/x.webp" },
      { slot: "hero-gallery", secureUrl: "http://res.cloudinary.com/demo/x.webp" },
      null,
    ], "demo");
    expect(Object.keys(result)).toEqual(["about-story"]);
    expect(result["about-story"]).toMatchObject({ url: url("a"), alt: "The shop", width: 1000, height: 700 });
    expect(normalizeSlotOverrides("nope", "demo")).toEqual({});
  });
  it("uses the override before the local file, and the local file when there is none", () => {
    const overrides = normalizeSlotOverrides([{ slot: "about-story", secureUrl: url("a"), alt: "The shop" }], "demo");
    // trusted-url reads the cloud name from the environment when resolve() checks it
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    expect(resolveImage("about-story", { available: ["about-story.webp"], overrides })).toMatchObject({ source: "override", src: url("a") });
    expect(resolveImage("about-story", { available: ["about-story.webp"], overrides: {} })).toMatchObject({ source: "file", src: "/images/about-story.webp" });
    expect(resolveImage("about-story", { available: [], overrides: {} }).source).toBe("fallback");
    delete process.env.CLOUDINARY_CLOUD_NAME;
  });
});

describe("slot writes", () => {
  function fakeDb() {
    const rows = new Map();
    const audit = [];
    const db = { collection: (name) => name === "auditLog" ? { insertOne: async (event) => { audit.push(event); } } : {
      updateOne: async (filter, update) => { rows.set(filter.slot, update.$set); return { matchedCount: 1 }; },
      deleteOne: async (filter) => ({ deletedCount: rows.delete(filter.slot) ? 1 : 0 }),
    } };
    return { db, rows, audit };
  }
  it("sets and clears an override, rejects unknown slots and audits without addresses", async () => {
    const { db, rows, audit } = fakeDb();
    const media = { id: "m1", secureUrl: url("a"), alt: "The shop", width: 1000, height: 700 };
    expect(await setSlotOverride(db, "about-story", media, "admin-1")).toEqual({ ok: true });
    expect(rows.get("about-story")).toMatchObject({ mediaId: "m1", secureUrl: url("a"), updatedBy: "admin-1" });
    expect((await setSlotOverride(db, "../etc", media, "admin-1")).error).toBe("unknown_slot");
    expect(await clearSlotOverride(db, "about-story", "admin-1")).toEqual({ ok: true });
    expect((await clearSlotOverride(db, "about-story", "admin-1")).error).toBe("not_found");
    expect(audit.map((event) => event.action)).toEqual(["images.slot_set", "images.slot_cleared"]);
    expect(JSON.stringify(audit)).not.toContain("cloudinary");
  });
});
