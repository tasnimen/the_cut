import { ObjectId } from "mongodb";
import { GALLERY_ID_PATTERN } from "@/lib/gallery/gallery-input";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Admin-side reads and writes for the `galleryItem` collection. Callers authorize first
// (requirePrincipal("mediaGalleryManageAll")). Each item points at a `media` document (the stored
// image and the provider's delete address); the public site reads only an allow-list of fields.

export const GALLERY_COLLECTION = "galleryItem";
export const MAX_GALLERY_ITEMS = 200;

const PROJECTION = { title: 1, category: 1, alt: 1, active: 1, displayUrl: 1, thumbUrl: 1, width: 1, height: 1, mediaId: 1, createdAt: 1, updatedAt: 1 };

function shape(doc) {
  return Object.freeze({
    id: String(doc._id),
    title: doc.title,
    category: doc.category,
    alt: doc.alt,
    active: doc.active === true,
    displayUrl: doc.displayUrl,
    thumbUrl: doc.thumbUrl || doc.displayUrl,
    width: doc.width,
    height: doc.height,
    createdAt: doc.createdAt.toISOString(),
  });
}

export async function listAdminGallery(db) {
  const docs = await db.collection(GALLERY_COLLECTION).find({}, { projection: PROJECTION }).sort({ createdAt: -1, _id: -1 }).limit(MAX_GALLERY_ITEMS).toArray();
  return docs.map(shape);
}

export async function countGalleryItems(db) {
  return db.collection(GALLERY_COLLECTION).countDocuments({});
}

// `media` is the record returned by the media service (public fields only).
export async function createGalleryItem(db, { media, meta }, actorId, now = new Date()) {
  const record = {
    mediaId: String(media.id),
    title: meta.title,
    category: meta.category,
    alt: meta.alt,
    active: true,
    displayUrl: media.displayUrl,
    thumbUrl: media.thumbUrl,
    width: media.width,
    height: media.height,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection(GALLERY_COLLECTION).insertOne(record);
  await appendAuditEvent(db, { actorId, action: "gallery.item_created", targetType: "GalleryItem", targetId: String(result.insertedId), outcome: "success", details: { category: meta.category } });
  return String(result.insertedId);
}

export async function updateGalleryItem(db, id, meta, actorId, now = new Date()) {
  if (!GALLERY_ID_PATTERN.test(String(id))) return { ok: false, error: "invalid" };
  const result = await db.collection(GALLERY_COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: { title: meta.title, category: meta.category, alt: meta.alt, updatedAt: now } });
  if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
  await appendAuditEvent(db, { actorId, action: "gallery.item_updated", targetType: "GalleryItem", targetId: String(id), outcome: "success", details: { category: meta.category } });
  return { ok: true };
}

export async function setGalleryItemActive(db, id, active, actorId, now = new Date()) {
  if (!GALLERY_ID_PATTERN.test(String(id))) return { ok: false, error: "invalid" };
  const result = await db.collection(GALLERY_COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: { active: Boolean(active), updatedAt: now } });
  if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
  await appendAuditEvent(db, { actorId, action: active ? "gallery.item_shown" : "gallery.item_hidden", targetType: "GalleryItem", targetId: String(id), outcome: "success" });
  return { ok: true };
}

// Removes the photo from the provider and the database. removeMedia({ mediaId }) must throw when the
// provider could not delete the file; then nothing is removed, so no orphaned or half-deleted item remains.
export async function deleteGalleryItem(db, id, actorId, { removeMedia }) {
  if (!GALLERY_ID_PATTERN.test(String(id))) return { ok: false, error: "invalid" };
  const item = await db.collection(GALLERY_COLLECTION).findOne({ _id: new ObjectId(id) }, { projection: { mediaId: 1 } });
  if (!item) return { ok: false, error: "not_found" };
  try {
    await removeMedia({ mediaId: item.mediaId });
  } catch {
    return { ok: false, error: "provider_failed" };
  }
  await db.collection(GALLERY_COLLECTION).deleteOne({ _id: item._id });
  await appendAuditEvent(db, { actorId, action: "gallery.item_deleted", targetType: "GalleryItem", targetId: String(id), outcome: "success" });
  return { ok: true };
}
