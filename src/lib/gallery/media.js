import "server-only";
import { ObjectId } from "mongodb";
import { processImageUpload } from "@/lib/storage/image-processor";
import { upload as uploadToStorage, remove as removeFromStorage } from "@/lib/storage";
import { createMediaService } from "@/lib/storage/media-service";
import { MEDIA_COLLECTION } from "@/lib/storage/media-model";

// The shared upload pipeline (type sniffing, size limit, WebP re-encode, ImgBB) wired to the database.
export function buildMediaService(db) {
  return createMediaService({
    processImage: processImageUpload,
    storage: { upload: uploadToStorage, delete: removeFromStorage },
    saveMedia: async (record) => (await db.collection(MEDIA_COLLECTION).insertOne(record)).insertedId,
    deleteMediaRecord: async (id) => db.collection(MEDIA_COLLECTION).deleteOne({ _id: id }),
  });
}

// Deletes a gallery photo's stored file and media record. Throws when the provider refuses, so callers keep the item.
export async function removeGalleryMedia(db, principal, mediaId) {
  if (!/^[a-f\d]{24}$/i.test(String(mediaId))) return;
  const record = await db.collection(MEDIA_COLLECTION).findOne({ _id: new ObjectId(mediaId) });
  if (!record) return; // already gone: nothing left to remove
  await buildMediaService(db).delete({ principal, record });
}
