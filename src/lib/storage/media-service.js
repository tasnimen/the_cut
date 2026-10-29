import { canUploadMedia, getMediaTargetRule } from "./upload-policy.js";
import { MediaRecordSchema, toPublicMediaRecord } from "./media-model.js";

// Upload and delete rules for images. The storage adapter is injected, so tests run with a mock.
//   storage.upload({ bytes, folder, mimeType })  -> { provider, publicId, secureUrl, width, height, format, bytes, folder, ... }
//   storage.delete(record)                        -> removes the stored file of a Media record (by public id)
// `audit({ action, mediaId, category })` is optional; the routes pass one so every upload and delete is logged.
export function createMediaService({ processImage, storage, saveMedia, deleteMediaRecord, audit = async () => {} }) {
  const forbidden = () => Object.assign(new Error("media_forbidden"), { status: 403 });

  return Object.freeze({
    async upload({ principal, target, file, alt }) {
      if (!canUploadMedia(principal?.role, target)) throw forbidden();
      const rule = getMediaTargetRule(target);
      const processed = await processImage(file);
      const remote = await storage.upload({ bytes: processed.bytes, folder: rule.folder, mimeType: "image/webp", filename: `${target}.webp` });
      if (remote.provider !== "cloudinary") {
        // Only the legacy provider reaches this branch, and only while STORAGE_PROVIDER=imgbb.
        throw Object.assign(new Error("media_provider_unsupported"), { status: 500 });
      }
      try {
        const record = MediaRecordSchema.parse({
          provider: remote.provider,
          publicId: remote.publicId,
          resourceType: remote.resourceType,
          secureUrl: remote.secureUrl,
          width: remote.width || processed.width,
          height: remote.height || processed.height,
          format: remote.format,
          bytes: remote.bytes || processed.bytes.length,
          folder: rule.folder,
          category: target,
          ownerId: rule.ownerOnly ? principal.id : null,
          uploadedBy: principal.id,
          alt: alt.trim(),
          createdAt: new Date(),
        });
        const id = await saveMedia(record);
        await audit({ action: "media.uploaded", mediaId: id, category: target });
        return toPublicMediaRecord(id, record);
      } catch {
        await storage.delete(remote).catch(() => {});
        throw new Error("media_save_failed");
      }
    },

    // Deletes the stored file (by public id) and then the record. If the provider refuses, the record stays.
    async delete({ principal, record }) {
      const rule = getMediaTargetRule(record?.category);
      if (!rule || !canUploadMedia(principal?.role, record.category) || (rule.ownerOnly && record.ownerId !== principal.id)) throw forbidden();
      await storage.delete(record);
      await deleteMediaRecord(record._id);
      await audit({ action: "media.deleted", mediaId: record._id, category: record.category });
      return Object.freeze({ deleted: true });
    },
  });
}
