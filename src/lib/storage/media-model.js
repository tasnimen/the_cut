import { z } from "zod";

export const MEDIA_COLLECTION = "media";

export const MediaRecordSchema = z.object({
  category: z.enum(["gallery", "products", "barbers", "services", "avatar"]),
  ownerId: z.string().nullable(),
  uploadedBy: z.string().min(1),
  url: z.string().url(),
  displayUrl: z.string().url(),
  thumbUrl: z.string().url(),
  deleteUrl: z.string().url(),
  width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000),
  alt: z.string().trim().min(1).max(300),
  mimeType: z.literal("image/webp"),
  byteSize: z.number().int().positive().max(5 * 1024 * 1024),
  createdAt: z.date(),
}).strict();

export function toPublicMediaRecord(id, record) {
  const { deleteUrl, ...safeRecord } = record;
  void deleteUrl;
  return Object.freeze({ id: String(id), ...safeRecord });
}
