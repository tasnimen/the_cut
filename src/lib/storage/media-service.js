import { randomUUID } from "node:crypto";
import { canUploadMedia, getMediaTargetRule } from "./upload-policy.js";
import { MEDIA_COLLECTION, MediaRecordSchema, toPublicMediaRecord } from "./media-model.js";

export function createMediaService({ processImage, storage, saveMedia, deleteMediaRecord }) {
  return Object.freeze({
    async upload({ principal, target, file, alt }) {
      if (!canUploadMedia(principal?.role, target)) {
        const error = new Error("media_forbidden");
        error.status = 403;
        throw error;
      }
      const rule = getMediaTargetRule(target);
      const processed = await processImage(file);
      const filename = `${randomUUID()}.webp`;
      const remote = await storage.upload({ bytes: processed.bytes, filename, mimeType: "image/webp" });
      try {
        const record = MediaRecordSchema.parse({
          category: target,
          ownerId: rule.ownerOnly ? principal.id : null,
          uploadedBy: principal.id,
          url: remote.url,
          displayUrl: remote.displayUrl,
          thumbUrl: remote.thumbUrl,
          deleteUrl: remote.deleteUrl,
          width: remote.width || processed.width,
          height: remote.height || processed.height,
          alt: alt.trim(),
          mimeType: "image/webp",
          byteSize: processed.bytes.length,
          createdAt: new Date(),
        });
        const id = await saveMedia(record);
        return toPublicMediaRecord(id, record);
      } catch {
        await storage.delete({ deleteUrl: remote.deleteUrl }).catch(() => {});
        throw new Error("media_save_failed");
      }
    },

    async delete({ principal, record }) {
      const rule = getMediaTargetRule(record?.category);
      if (!rule || !canUploadMedia(principal?.role, record.category)
        || (rule.ownerOnly && record.ownerId !== principal.id)) {
        const error = new Error("media_forbidden");
        error.status = 403;
        throw error;
      }
      await storage.delete({ deleteUrl: record.deleteUrl });
      await deleteMediaRecord(record._id);
      return Object.freeze({ deleted: true });
    },
  });
}
