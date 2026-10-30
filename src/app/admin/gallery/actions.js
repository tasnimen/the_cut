"use server";

import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { revalidateCatalog } from "@/lib/catalog/revalidate";
import { deleteGalleryItem, setGalleryItemActive, updateGalleryItem } from "@/lib/gallery/admin-gallery";
import { galleryFieldErrors, GalleryMetaSchema } from "@/lib/gallery/gallery-input";
import { removeGalleryMedia } from "@/lib/gallery/media";
import { getMongo } from "@/lib/db/mongo";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export is a public HTTP endpoint: each call re-checks session, role, TOTP and mediaGalleryManageAll.
// Ids and fields come from the client and are validated; nothing here accepts an address, size or owner.

const RATE = { bucket: "admin-gallery", limit: 60, windowMs: 60_000 };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };
const NOT_FOUND = { status: "error", code: "not_found", message: "That photo was not found." };

async function authorize(capability) {
  try {
    const principal = await requirePrincipal("mediaGalleryManageAll", { capability });
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many changes in a short time. Wait a moment and try again." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

export async function updateGalleryItemAction(id, input) {
  const auth = await authorize("gallery.edit");
  if (auth.error) return auth.error;
  const parsed = GalleryMetaSchema.safeParse(input);
  if (!parsed.success) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: galleryFieldErrors(parsed.error) };
  const { db } = await getMongo();
  const result = await updateGalleryItem(db, id, parsed.data, auth.principal.id);
  if (!result.ok) return NOT_FOUND;
  revalidateCatalog(["gallery"]);
  return { status: "success", code: "saved", message: "Saved." };
}

export async function setGalleryActiveAction(id, active) {
  const auth = await authorize("gallery.hide");
  if (auth.error) return auth.error;
  if (typeof active !== "boolean") return { status: "error", code: "invalid", message: "That change is not valid." };
  const { db } = await getMongo();
  const result = await setGalleryItemActive(db, id, active, auth.principal.id);
  if (!result.ok) return NOT_FOUND;
  revalidateCatalog(["gallery"]);
  return { status: "success", code: "saved", message: "Saved." };
}

export async function deleteGalleryItemAction(id) {
  const auth = await authorize("gallery.delete");
  if (auth.error) return auth.error;
  const { db } = await getMongo();
  const result = await deleteGalleryItem(db, id, auth.principal.id, { removeMedia: ({ mediaId }) => removeGalleryMedia(db, auth.principal, mediaId) });
  if (!result.ok && result.error === "provider_failed") return { status: "error", code: "provider_failed", message: "The image service did not delete the file, so nothing was removed. Try again, or hide the photo instead." };
  if (!result.ok) return NOT_FOUND;
  revalidateCatalog(["gallery"]);
  return { status: "success", code: "deleted", message: "Photo deleted." };
}
