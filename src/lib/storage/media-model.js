import { z } from "zod";
import { MAX_IMAGE_BYTES } from "@/lib/storage/upload-policy";

export const MEDIA_COLLECTION = "media";
export const MEDIA_CATEGORIES = Object.freeze(["gallery", "products", "barbers", "services", "avatar", "banners", "slots"]);

// A stored image. Features keep the Media id and read the address from here, never a raw URL of their own.
// Records written before the Cloudinary switch (ImgBB) have no `provider`: they carry `url`, `displayUrl`,
// `thumbUrl` and `deleteUrl` instead and stay readable and deletable (see lib/storage/index.js).
export const MediaRecordSchema = z.object({
  provider: z.literal("cloudinary"),
  publicId: z.string().regex(/^the-cut\/[a-z_]+\/[A-Za-z0-9-]{8,64}$/),
  resourceType: z.literal("image"),
  secureUrl: z.string().url(),
  width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000),
  format: z.string().min(2).max(10),
  bytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
  folder: z.string().regex(/^the-cut\/[a-z_]+$/),
  category: z.enum(MEDIA_CATEGORIES),
  ownerId: z.string().nullable(),
  uploadedBy: z.string().min(1),
  alt: z.string().trim().min(1).max(300),
  createdAt: z.date(),
}).strict();

// What callers and the browser may see. No provider internals (public id, delete address) leave the server.
// `displayUrl` and `thumbUrl` are kept for existing screens (both are the stored address; next/image resizes).
export function toPublicMediaRecord(id, record) {
  const secureUrl = record.secureUrl ?? record.displayUrl ?? record.url;
  return Object.freeze({
    id: String(id),
    category: record.category,
    ownerId: record.ownerId ?? null,
    secureUrl,
    displayUrl: secureUrl,
    thumbUrl: secureUrl,
    width: record.width,
    height: record.height,
    format: record.format ?? "webp",
    bytes: record.bytes ?? record.byteSize,
    alt: record.alt,
    createdAt: record.createdAt,
  });
}
