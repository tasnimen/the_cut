import "server-only";
import sharp from "sharp";
import { inspectImageBytes, MAX_IMAGE_BYTES, UploadValidationError, validateProcessedDimensions } from "@/lib/storage/upload-policy";

export async function processImageUpload(file) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const inspected = inspectImageBytes({ bytes, declaredType: file.type, size: file.size });
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const metadata = await image.metadata();
  validateProcessedDimensions(metadata.width, metadata.height);
  if (metadata.pages && metadata.pages > 1) throw new Error("animated_images_not_supported");

  const result = await image
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer({ resolveWithObject: true });
  if (result.data.length > MAX_IMAGE_BYTES) throw new UploadValidationError("processed_file_too_large");

  return Object.freeze({
    bytes: result.data,
    mimeType: "image/webp",
    width: result.info.width,
    height: result.info.height,
    sourceType: inspected.mimeType,
  });
}
