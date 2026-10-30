import { ObjectId } from "mongodb";
import { MEDIA_ID_PATTERN, normalizeImage, planImageChange } from "@/lib/catalog/image-input";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Attach, replace and remove the picture of a service, barber or package (callers authorize first).
// Rules:
//  - a picture is attached only AFTER the record itself saved (the caller saves, then calls applyImageChange);
//  - the media must exist, belong to the same kind, and not be attached to another record
//    (`attachedTo`), so a record can never take another record's asset;
//  - an old picture is deleted (Cloudinary file and media record) only after the new state is saved;
//    if that delete fails the asset is flagged `orphaned` and a stale-media sweep removes it later.

export const CATALOG_KINDS = Object.freeze({
  services: { collection: "service", targetType: "Service", permission: "mediaServicesManageAll" },
  barbers: { collection: "barber", targetType: "Barber", permission: "mediaBarbersManageAll" },
  packages: { collection: "pricingPackage", targetType: "Package", permission: "mediaPackagesManageAll" },
});

const MEDIA = "media";
export const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const oid = (id) => new ObjectId(String(id));

// A pending upload may be attached by an admin only if it is of the right kind and unattached (or already this record's).
export async function findAttachableMedia(db, kind, mediaId, slug) {
  if (!MEDIA_ID_PATTERN.test(String(mediaId))) return null;
  const media = await db.collection(MEDIA).findOne({ _id: oid(mediaId), category: kind, provider: "cloudinary" });
  if (!media) return null;
  const owner = media.attachedTo;
  if (owner && !(owner.kind === kind && owner.slug === slug)) return null;
  return media;
}

async function discardAsset(db, removeMedia, mediaId, auditContext) {
  try {
    await removeMedia(mediaId);
    return true;
  } catch {
    // Keep the record of the asset so a later sweep can retry; never lose track of a stored file.
    await db.collection(MEDIA).updateOne({ _id: oid(mediaId) }, { $set: { attachedTo: null, orphaned: true } }).catch(() => {});
    await appendAuditEvent(db, { ...auditContext, action: "catalog.image_delete_failed", outcome: "failure" }).catch(() => {});
    return false;
  }
}

// `current` is the record's existing image (as stored), `plan` comes from planImageChange.
export async function applyImageChange(db, { kind, slug, current, plan, actorId, removeMedia }) {
  const config = CATALOG_KINDS[kind];
  if (!config) return { ok: false, error: "unknown_kind" };
  const audit = { actorId, targetType: config.targetType, targetId: slug, outcome: "success" };
  const records = db.collection(config.collection);
  const oldMediaId = current?.mediaId ?? null;

  if (plan.type === "none") return { ok: true, changed: false };

  if (plan.type === "alt") {
    const result = await records.updateOne({ slug, "image.mediaId": oldMediaId }, { $set: { "image.alt": plan.alt, updatedAt: new Date() } });
    if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
    await appendAuditEvent(db, { ...audit, action: "catalog.image_alt_updated" });
    return { ok: true, changed: true };
  }

  if (plan.type === "remove") {
    const result = await records.updateOne({ slug }, { $unset: { image: "" }, $set: { updatedAt: new Date() } });
    if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
    await appendAuditEvent(db, { ...audit, action: "catalog.image_removed", details: { kind } });
    if (oldMediaId) await discardAsset(db, removeMedia, oldMediaId, audit);
    return { ok: true, changed: true };
  }

  // attach or replace
  const media = await findAttachableMedia(db, kind, plan.mediaId, slug);
  if (!media) return { ok: false, error: "media_not_available" };
  const image = { mediaId: String(media._id), secureUrl: media.secureUrl, width: media.width, height: media.height, alt: plan.alt };
  const result = await records.updateOne({ slug }, { $set: { image, updatedAt: new Date() } });
  if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
  await db.collection(MEDIA).updateOne({ _id: media._id }, { $set: { attachedTo: { kind, slug }, alt: plan.alt, orphaned: false } });
  await appendAuditEvent(db, { ...audit, action: oldMediaId ? "catalog.image_replaced" : "catalog.image_attached", details: { kind } });
  if (oldMediaId && oldMediaId !== String(media._id)) await discardAsset(db, removeMedia, oldMediaId, audit);
  return { ok: true, changed: true };
}

// Before saving a form: verify a pending upload is usable, so a bad id is reported with the form errors.
export async function checkPendingImage(db, kind, fields, slug) {
  if (!fields.mediaId) return { ok: true };
  return (await findAttachableMedia(db, kind, fields.mediaId, slug)) ? { ok: true } : { ok: false, error: "media_not_available" };
}

// One call for the actions: plan from the form fields, then apply. `record` is the saved record (or null).
export async function saveImageForRecord(db, { kind, slug, record, fields, actorId, removeMedia }) {
  const current = normalizeImage(record?.image);
  const plan = planImageChange(current, fields);
  return applyImageChange(db, { kind, slug, current, plan, actorId, removeMedia });
}

// An admin discarding a freshly uploaded, still unattached picture (for example after choosing another file).
export async function discardPendingMedia(db, kind, mediaId, removeMedia) {
  if (!MEDIA_ID_PATTERN.test(String(mediaId))) return { ok: false, error: "invalid" };
  const media = await db.collection(MEDIA).findOne({ _id: oid(mediaId), category: kind });
  if (!media) return { ok: false, error: "not_found" };
  if (media.attachedTo) return { ok: false, error: "attached" };
  await removeMedia(String(media._id));
  return { ok: true };
}

// Pending uploads nobody attached within a day (form abandoned) and assets whose delete failed earlier.
export async function sweepStaleMedia(db, kind, removeMedia, { now = new Date(), limit = 10 } = {}) {
  const cutoff = new Date(now.getTime() - PENDING_MAX_AGE_MS);
  const stale = await db.collection(MEDIA).find({ category: kind, attachedTo: null, createdAt: { $lt: cutoff } }, { projection: { _id: 1 } }).limit(limit).toArray();
  let removed = 0;
  for (const item of stale) {
    try {
      await removeMedia(String(item._id));
      removed += 1;
    } catch {
      // try again on the next sweep
    }
  }
  return { removed };
}
