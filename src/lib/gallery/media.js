import "server-only";
import { ObjectId } from "mongodb";
import { buildMediaService } from "@/lib/storage/build-service";
import { MEDIA_COLLECTION } from "@/lib/storage/media-model";

export { buildMediaService };

// Deletes a gallery photo's stored file and media record. Throws when the provider refuses, so callers keep the item.
export async function removeGalleryMedia(db, principal, mediaId) {
  if (!/^[a-f\d]{24}$/i.test(String(mediaId))) return;
  const record = await db.collection(MEDIA_COLLECTION).findOne({ _id: new ObjectId(mediaId) });
  if (!record) return; // already gone: nothing left to remove
  await buildMediaService(db, principal.id).delete({ principal, record });
}
