import { hasPermission } from "@/lib/auth/policy";
import { CATALOG_KINDS, checkPendingImage, saveImageForRecord } from "@/lib/catalog/catalog-images";
import { planImageChange, readImageFields, normalizeImage } from "@/lib/catalog/image-input";
import { removeGalleryMedia } from "@/lib/gallery/media";

// The picture part of the service, barber and package Server Actions, shared so the three behave the same.
// Used as: readPicture (before saving the record) -> save the record -> savePicture (attaches the picture).

const IMAGE_ERROR = "Check the picture and its description.";

// Reads and checks the three picture keys. A pending upload must exist, be of this kind and be unattached.
export async function readPicture(db, { kind, slug, formData, principal }) {
  const read = readImageFields(formData);
  if (!read.ok) return { ok: false, fieldErrors: read.fieldErrors, message: IMAGE_ERROR };
  const fields = read.data;
  const wantsChange = Boolean(fields.mediaId || fields.remove);
  // Each action authorizes the picture permission on its own, even though the record permission passed.
  if (wantsChange && !hasPermission(principal.role, CATALOG_KINDS[kind].permission)) return { ok: false, denied: true };
  const pending = await checkPendingImage(db, kind, fields, slug);
  if (!pending.ok) return { ok: false, fieldErrors: { image: "That upload is no longer available. Add the picture again." }, message: IMAGE_ERROR };
  return { ok: true, fields };
}

// After the record saved: attach, replace or remove the picture, then delete the old asset.
export async function savePicture(db, { kind, slug, fields, principal }) {
  const record = await db.collection(CATALOG_KINDS[kind].collection).findOne({ slug }, { projection: { image: 1 } });
  const plan = planImageChange(normalizeImage(record?.image), fields);
  if (plan.type === "none") return { ok: true };
  return saveImageForRecord(db, { kind, slug, record, fields, actorId: principal.id, removeMedia: (mediaId) => removeGalleryMedia(db, principal, mediaId) });
}

export const PICTURE_FAILED_MESSAGE = "The record was saved, but the picture could not be added. Open it again and add the picture once more.";
