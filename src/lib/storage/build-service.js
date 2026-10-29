import "server-only";
import { upload as uploadToStorage, remove as removeFromStorage } from "@/lib/storage";
import { processImageUpload } from "@/lib/storage/image-processor";
import { createMediaService } from "@/lib/storage/media-service";
import { MEDIA_COLLECTION } from "@/lib/storage/media-model";
import { appendAuditEvent } from "@/lib/security/audit-log";

// The shared upload pipeline wired to the database: type sniffing, size limit, EXIF stripping and WebP
// re-encode (image-processor), the configured image service, and an audit event for every upload and delete.
export function buildMediaService(db, actorId) {
  return createMediaService({
    processImage: processImageUpload,
    storage: { upload: uploadToStorage, delete: removeFromStorage },
    saveMedia: async (record) => (await db.collection(MEDIA_COLLECTION).insertOne(record)).insertedId,
    deleteMediaRecord: async (id) => db.collection(MEDIA_COLLECTION).deleteOne({ _id: id }),
    audit: ({ action, mediaId, category }) => appendAuditEvent(db, { actorId, action, targetType: "Media", targetId: String(mediaId), outcome: "success", details: { category } }),
  });
}
