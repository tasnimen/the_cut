import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { countGalleryItems, createGalleryItem, deleteGalleryItem, listAdminGallery, setGalleryItemActive, updateGalleryItem } from "@/lib/gallery/admin-gallery";

vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: async (db, event) => db.collection("auditLog").insertOne(event) }));

function fakeDb(items = []) {
  const audit = [];
  const calls = {};
  const cursor = (rows) => ({ sort: () => cursor(rows), limit: () => cursor(rows), toArray: async () => rows });
  const db = { collection: (name) => {
    if (name === "auditLog") return { insertOne: async (event) => { audit.push(event); } };
    return {
      find: (query, options) => { calls.projection = options.projection; return cursor(items); },
      countDocuments: async () => items.length,
      insertOne: async (record) => { const _id = new ObjectId(); items.push({ _id, ...record }); return { insertedId: _id }; },
      findOne: async (query) => items.find((i) => String(i._id) === String(query._id)) ?? null,
      updateOne: async (query, update) => { const i = items.find((x) => String(x._id) === String(query._id)); if (!i) return { matchedCount: 0 }; Object.assign(i, update.$set); return { matchedCount: 1 }; },
      deleteOne: async (query) => { const index = items.findIndex((i) => String(i._id) === String(query._id)); if (index >= 0) items.splice(index, 1); return { deletedCount: index >= 0 ? 1 : 0 }; },
    };
  } };
  return { db, audit, items, calls };
}

const media = { id: "m1", displayUrl: "https://i.ibb.co/a/b.webp", thumbUrl: "https://i.ibb.co/a/t.webp", width: 1200, height: 800 };
const meta = { title: "Skin fade", category: "Haircuts", alt: "A skin fade from the side" };

describe("gallery admin data", () => {
  it("creates an active item from the upload result and audits it without the text", async () => {
    const { db, audit, items } = fakeDb();
    const id = await createGalleryItem(db, { media, meta }, "admin-1", new Date("2026-10-30T10:00:00Z"));
    expect(id).toMatch(/^[a-f\d]{24}$/);
    expect(items[0]).toMatchObject({ mediaId: "m1", title: "Skin fade", category: "Haircuts", active: true, displayUrl: media.displayUrl, createdBy: "admin-1" });
    expect(audit[0]).toMatchObject({ actorId: "admin-1", action: "gallery.item_created", details: { category: "Haircuts" } });
    expect(JSON.stringify(audit)).not.toMatch(/skin fade/i);
  });

  it("lists items without the provider's delete address", async () => {
    const { db, calls, items } = fakeDb();
    await createGalleryItem(db, { media, meta }, "admin-1");
    const list = await listAdminGallery(db);
    expect(list).toHaveLength(1);
    expect(Object.keys(calls.projection)).not.toContain("deleteUrl");
    expect(JSON.stringify(list)).not.toMatch(/createdBy|deleteUrl/);
    expect(await countGalleryItems(db)).toBe(items.length);
  });

  it("updates text fields only and shows or hides items", async () => {
    const { db, items, audit } = fakeDb();
    const id = await createGalleryItem(db, { media, meta }, "admin-1");
    expect(await updateGalleryItem(db, id, { ...meta, title: "Renamed" }, "admin-1")).toEqual({ ok: true });
    expect(items[0].title).toBe("Renamed");
    expect(items[0].displayUrl).toBe(media.displayUrl);
    expect(await setGalleryItemActive(db, id, false, "admin-1")).toEqual({ ok: true });
    expect(items[0].active).toBe(false);
    expect(audit.map((event) => event.action)).toEqual(["gallery.item_created", "gallery.item_updated", "gallery.item_hidden"]);
    expect((await updateGalleryItem(db, "bad", meta, "a")).error).toBe("invalid");
    expect((await setGalleryItemActive(db, String(new ObjectId()), true, "a")).error).toBe("not_found");
  });

  it("deletes the stored file first and keeps the item when the provider fails", async () => {
    const { db, items, audit } = fakeDb();
    const id = await createGalleryItem(db, { media, meta }, "admin-1");
    const failing = vi.fn().mockRejectedValue(new Error("imgbb_delete_failed"));
    expect(await deleteGalleryItem(db, id, "admin-1", { removeMedia: failing })).toEqual({ ok: false, error: "provider_failed" });
    expect(items).toHaveLength(1);
    const removing = vi.fn().mockResolvedValue(undefined);
    expect(await deleteGalleryItem(db, id, "admin-1", { removeMedia: removing })).toEqual({ ok: true });
    expect(removing).toHaveBeenCalledWith({ mediaId: "m1" });
    expect(items).toHaveLength(0);
    expect(audit.at(-1)).toMatchObject({ action: "gallery.item_deleted" });
    expect((await deleteGalleryItem(db, id, "admin-1", { removeMedia: removing })).error).toBe("not_found");
    expect((await deleteGalleryItem(db, "bad", "admin-1", { removeMedia: removing })).error).toBe("invalid");
  });
});
