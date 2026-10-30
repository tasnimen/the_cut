import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { applyImageChange, checkPendingImage, discardPendingMedia, findAttachableMedia, saveImageForRecord, sweepStaleMedia } from "@/lib/catalog/catalog-images";
import { normalizeImage, planImageChange, publicImage, pictureFor, readImageFields } from "@/lib/catalog/image-input";

vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: async (db, event) => db.collection("auditLog").insertOne(event) }));

const CLOUD = "demo";
const url = (name) => `https://res.cloudinary.com/${CLOUD}/image/upload/v1/the-cut/services/${name}.webp`;
process.env.CLOUDINARY_CLOUD_NAME = CLOUD;

const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
const matches = (doc, filter) => Object.entries(filter).every(([key, expected]) => {
  const actual = get(doc, key);
  if (expected && typeof expected === "object" && "$lt" in expected) return actual < expected.$lt;
  if (expected === null) return actual === null || actual === undefined;
  return String(actual) === String(expected);
});

function fakeDb({ records = [], media = [] } = {}) {
  const tables = { service: records, barber: [], pricingPackage: [], media, auditLog: [] };
  const db = { collection: (name) => {
    const rows = tables[name] ?? (tables[name] = []);
    return {
      findOne: async (filter) => rows.find((row) => matches(row, filter)) ?? null,
      find: (filter) => ({ limit: () => ({ toArray: async () => rows.filter((row) => matches(row, filter)) }) }),
      insertOne: async (doc) => { rows.push(doc); },
      updateOne: async (filter, update) => {
        const row = rows.find((item) => matches(item, filter));
        if (!row) return { matchedCount: 0 };
        for (const [path, value] of Object.entries(update.$set ?? {})) {
          const keys = path.split(".");
          const last = keys.pop();
          const target = keys.reduce((object, key) => (object[key] ??= {}), row);
          target[last] = value;
        }
        for (const key of Object.keys(update.$unset ?? {})) delete row[key];
        return { matchedCount: 1 };
      },
    };
  } };
  return { db, tables };
}

const mediaDoc = (overrides = {}) => ({ _id: new ObjectId(), category: "services", provider: "cloudinary", secureUrl: url("a"), width: 640, height: 480, createdAt: new Date(), ...overrides });

describe("image-input", () => {
  const form = (values) => ({ get: (key) => values[key] ?? null });
  const id = "a".repeat(24);

  it("requires a description when a picture is added, and bounds it", () => {
    expect(readImageFields(form({ imageMediaId: id, imageAlt: "" })).fieldErrors.imageAlt).toMatch(/Describe/);
    expect(readImageFields(form({ imageMediaId: id, imageAlt: "abc" })).ok).toBe(false);
    expect(readImageFields(form({ imageMediaId: id, imageAlt: "A fresh fade" })).data).toEqual({ mediaId: id, alt: "A fresh fade", remove: false });
    expect(readImageFields(form({ imageAlt: "<b>x</b> hello" })).fieldErrors.imageAlt).toBeTruthy();
    expect(readImageFields(form({ imageMediaId: id, imageAlt: "x".repeat(201) })).ok).toBe(false);
    expect(readImageFields(form({ imageMediaId: "../etc" })).fieldErrors.image).toBeTruthy();
  });
  it("reads removal, and ignores any address or size keys", () => {
    expect(readImageFields(form({ removeImage: "on" })).data).toEqual({ mediaId: null, alt: "", remove: true });
    const read = readImageFields(form({ imageMediaId: id, imageAlt: "A fresh fade", secureUrl: "https://evil.example/x.png", width: "1" }));
    expect(JSON.stringify(read.data)).not.toContain("evil");
  });
  it("plans attach, remove, alt update or nothing", () => {
    const current = { mediaId: "m1", alt: "Old text here" };
    expect(planImageChange(null, { mediaId: id, alt: "New text here", remove: false }).type).toBe("attach");
    expect(planImageChange(current, { mediaId: id, alt: "New text here", remove: false }).type).toBe("attach");
    expect(planImageChange(current, { mediaId: null, alt: "", remove: true }).type).toBe("remove");
    expect(planImageChange(null, { mediaId: null, alt: "", remove: true }).type).toBe("none");
    expect(planImageChange(current, { mediaId: null, alt: "Changed text", remove: false }).type).toBe("alt");
    expect(planImageChange(current, { mediaId: null, alt: "Old text here", remove: false }).type).toBe("none");
  });
  it("shows only trusted pictures, and the public view has no media id", () => {
    const stored = { mediaId: "m1", secureUrl: url("a"), width: 640, height: 480, alt: "A fade", extra: "x" };
    expect(normalizeImage(stored)).toMatchObject({ mediaId: "m1", url: url("a"), alt: "A fade" });
    expect(publicImage(stored)).toEqual({ url: url("a"), alt: "A fade", width: 640, height: 480 });
    expect(normalizeImage({ ...stored, secureUrl: "https://evil.example/a.webp" })).toBeNull();
    expect(normalizeImage(null)).toBeNull();
    expect(JSON.stringify(publicImage(stored))).not.toMatch(/m1|extra/);
  });
  it("falls back to the slot picture when the record has none", () => {
    const fallback = { src: "/images/card-image.webp", alt: "Shared card" };
    expect(pictureFor({ image: null }, fallback)).toBe(fallback);
    expect(pictureFor({}, fallback)).toBe(fallback);
    expect(pictureFor({ image: { url: url("a"), alt: "A fade" } }, fallback)).toMatchObject({ src: url("a"), alt: "A fade", source: "upload" });
  });
});

describe("attach, replace, remove", () => {
  const record = () => ({ slug: "haircut", name: "Haircut" });
  const run = (db, plan, current = null, removeMedia = vi.fn(async () => {})) => applyImageChange(db, { kind: "services", slug: "haircut", current, plan, actorId: "admin-1", removeMedia }).then((result) => ({ result, removeMedia }));

  it("attaches a pending upload and marks the media as belonging to this record", async () => {
    const media = mediaDoc();
    const { db, tables } = fakeDb({ records: [record()], media: [media] });
    const { result, removeMedia } = await run(db, { type: "attach", mediaId: String(media._id), alt: "A skin fade" });
    expect(result).toEqual({ ok: true, changed: true });
    expect(tables.service[0].image).toEqual({ mediaId: String(media._id), secureUrl: url("a"), width: 640, height: 480, alt: "A skin fade" });
    expect(tables.media[0].attachedTo).toEqual({ kind: "services", slug: "haircut" });
    expect(removeMedia).not.toHaveBeenCalled();
    expect(tables.auditLog[0]).toMatchObject({ action: "catalog.image_attached", actorId: "admin-1", targetId: "haircut" });
  });

  it("replaces the picture and deletes the old asset only after the new one is saved", async () => {
    const oldMedia = mediaDoc({ attachedTo: { kind: "services", slug: "haircut" } });
    const next = mediaDoc({ secureUrl: url("b") });
    const { db, tables } = fakeDb({ records: [{ ...record(), image: { mediaId: String(oldMedia._id), secureUrl: url("a"), alt: "Old picture" } }], media: [oldMedia, next] });
    const order = [];
    const removeMedia = vi.fn(async () => { order.push(`remove saw ${tables.service[0].image.secureUrl === url("b") ? "new picture saved" : "old picture still saved"}`); });
    const { result } = await run(db, { type: "attach", mediaId: String(next._id), alt: "New picture here" }, { mediaId: String(oldMedia._id), alt: "Old picture" }, removeMedia);
    expect(result.ok).toBe(true);
    expect(order).toEqual(["remove saw new picture saved"]);
    expect(removeMedia).toHaveBeenCalledWith(String(oldMedia._id));
    expect(tables.auditLog[0].action).toBe("catalog.image_replaced");
  });

  it("removes the picture and deletes the asset", async () => {
    const oldMedia = mediaDoc({ attachedTo: { kind: "services", slug: "haircut" } });
    const { db, tables } = fakeDb({ records: [{ ...record(), image: { mediaId: String(oldMedia._id), secureUrl: url("a"), alt: "Old picture" } }], media: [oldMedia] });
    const { result, removeMedia } = await run(db, { type: "remove" }, { mediaId: String(oldMedia._id) });
    expect(result.ok).toBe(true);
    expect(tables.service[0]).not.toHaveProperty("image");
    expect(removeMedia).toHaveBeenCalledWith(String(oldMedia._id));
    expect(tables.auditLog[0].action).toBe("catalog.image_removed");
  });

  it("flags the old asset for a later sweep when the provider refuses to delete it (no lost files)", async () => {
    const oldMedia = mediaDoc({ attachedTo: { kind: "services", slug: "haircut" } });
    const { db, tables } = fakeDb({ records: [{ ...record(), image: { mediaId: String(oldMedia._id), secureUrl: url("a"), alt: "Old picture" } }], media: [oldMedia] });
    const { result } = await run(db, { type: "remove" }, { mediaId: String(oldMedia._id) }, vi.fn(async () => { throw new Error("provider"); }));
    expect(result.ok).toBe(true);
    expect(tables.media[0]).toMatchObject({ attachedTo: null, orphaned: true });
    expect(tables.auditLog.map((event) => event.action)).toContain("catalog.image_delete_failed");
  });

  it("updates only the description when no new picture was added", async () => {
    const { db, tables } = fakeDb({ records: [{ ...record(), image: { mediaId: "m1", secureUrl: url("a"), alt: "Old picture" } }] });
    const { result } = await run(db, { type: "alt", alt: "Better description" }, { mediaId: "m1" });
    expect(result.ok).toBe(true);
    expect(tables.service[0].image.alt).toBe("Better description");
    expect(tables.service[0].image.secureUrl).toBe(url("a"));
  });

  it("does nothing for a record without a picture that asks for nothing", async () => {
    const { db, tables } = fakeDb({ records: [record()] });
    expect((await run(db, { type: "none" })).result).toEqual({ ok: true, changed: false });
    expect(tables.auditLog).toHaveLength(0);
  });

  it("works end to end through saveImageForRecord and leaves records without a picture alone", async () => {
    const media = mediaDoc();
    const { db, tables } = fakeDb({ records: [record()], media: [media] });
    const removeMedia = vi.fn();
    await saveImageForRecord(db, { kind: "services", slug: "haircut", record: tables.service[0], fields: { mediaId: String(media._id), alt: "A skin fade", remove: false }, actorId: "a", removeMedia });
    expect(tables.service[0].image.alt).toBe("A skin fade");
    const untouched = fakeDb({ records: [record()] });
    expect(await saveImageForRecord(untouched.db, { kind: "services", slug: "haircut", record: untouched.tables.service[0], fields: { mediaId: null, alt: "", remove: false }, actorId: "a", removeMedia })).toEqual({ ok: true, changed: false });
  });
});

describe("one record cannot take another record's asset", () => {
  it("refuses media of another kind, attached elsewhere, missing or malformed", async () => {
    const barberMedia = mediaDoc({ category: "barbers" });
    const attachedElsewhere = mediaDoc({ attachedTo: { kind: "services", slug: "beard-trim" } });
    const attachedHere = mediaDoc({ attachedTo: { kind: "services", slug: "haircut" } });
    const legacy = mediaDoc({ provider: undefined });
    const { db } = fakeDb({ records: [{ slug: "haircut" }], media: [barberMedia, attachedElsewhere, attachedHere, legacy] });
    expect(await findAttachableMedia(db, "services", String(barberMedia._id), "haircut")).toBeNull();
    expect(await findAttachableMedia(db, "services", String(attachedElsewhere._id), "haircut")).toBeNull();
    expect(await findAttachableMedia(db, "services", String(attachedHere._id), "haircut")).not.toBeNull();
    expect(await findAttachableMedia(db, "services", String(new ObjectId()), "haircut")).toBeNull();
    expect(await findAttachableMedia(db, "services", "not-an-id", "haircut")).toBeNull();
    const refused = await applyImageChange(db, { kind: "services", slug: "haircut", current: null, plan: { type: "attach", mediaId: String(attachedElsewhere._id), alt: "Some alt text" }, actorId: "a", removeMedia: vi.fn() });
    expect(refused).toEqual({ ok: false, error: "media_not_available" });
    expect(await checkPendingImage(db, "services", { mediaId: String(barberMedia._id) }, "haircut")).toEqual({ ok: false, error: "media_not_available" });
    expect(await checkPendingImage(db, "services", { mediaId: null }, "haircut")).toEqual({ ok: true });
  });

  it("does not change a record that does not exist", async () => {
    const media = mediaDoc();
    const { db, tables } = fakeDb({ records: [], media: [media] });
    const result = await applyImageChange(db, { kind: "services", slug: "ghost", current: null, plan: { type: "attach", mediaId: String(media._id), alt: "Some alt text" }, actorId: "a", removeMedia: vi.fn() });
    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(tables.media[0].attachedTo).toBeUndefined();
  });
});

describe("pending uploads", () => {
  it("only an unattached upload of the right kind can be discarded", async () => {
    const pending = mediaDoc();
    const attached = mediaDoc({ attachedTo: { kind: "services", slug: "haircut" } });
    const { db } = fakeDb({ media: [pending, attached] });
    const removeMedia = vi.fn();
    expect(await discardPendingMedia(db, "services", String(attached._id), removeMedia)).toEqual({ ok: false, error: "attached" });
    expect(await discardPendingMedia(db, "barbers", String(pending._id), removeMedia)).toEqual({ ok: false, error: "not_found" });
    expect(await discardPendingMedia(db, "services", "bad", removeMedia)).toEqual({ ok: false, error: "invalid" });
    expect(removeMedia).not.toHaveBeenCalled();
    expect(await discardPendingMedia(db, "services", String(pending._id), removeMedia)).toEqual({ ok: true });
    expect(removeMedia).toHaveBeenCalledWith(String(pending._id));
  });

  it("the sweep removes stale unattached uploads only", async () => {
    const day = 24 * 60 * 60 * 1000;
    const stale = mediaDoc({ createdAt: new Date(Date.now() - 2 * day) });
    const fresh = mediaDoc({ createdAt: new Date() });
    const attached = mediaDoc({ createdAt: new Date(Date.now() - 5 * day), attachedTo: { kind: "services", slug: "haircut" } });
    const { db } = fakeDb({ media: [stale, fresh, attached] });
    const removeMedia = vi.fn();
    expect(await sweepStaleMedia(db, "services", removeMedia)).toEqual({ removed: 1 });
    expect(removeMedia).toHaveBeenCalledTimes(1);
    expect(removeMedia).toHaveBeenCalledWith(String(stale._id));
  });
});
