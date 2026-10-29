import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processImageUpload } from "./image-processor.js";
import { UploadValidationError } from "./upload-policy.js";

async function jpegWithMetadata(width, height) {
  const bytes = await sharp({ create: { width, height, channels: 3, background: "#c9a24a" } })
    .withExif({ IFD0: { Copyright: "Secret Photographer" }, IFD3: { GPSLatitudeRef: "N", GPSLongitudeRef: "W" } })
    .jpeg()
    .toBuffer();
  return bytes;
}

const asFile = (bytes, type) => ({ size: bytes.length, type, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

describe("processImageUpload", () => {
  it("re-encodes to WebP and strips EXIF and GPS data", async () => {
    const source = await jpegWithMetadata(400, 300);
    expect((await sharp(source).metadata()).exif).toBeTruthy();
    const result = await processImageUpload(asFile(source, "image/jpeg"));
    expect(result.mimeType).toBe("image/webp");
    const out = await sharp(result.bytes).metadata();
    expect(out.format).toBe("webp");
    expect(out.exif).toBeUndefined();
    expect(result.bytes.toString("latin1")).not.toContain("Secret Photographer");
  });

  it("resizes anything larger than 2000 px on the long side, and never enlarges", async () => {
    const big = await jpegWithMetadata(3000, 1500);
    const resized = await sharp((await processImageUpload(asFile(big, "image/jpeg"))).bytes).metadata();
    expect(Math.max(resized.width, resized.height)).toBe(2000);
    const small = await jpegWithMetadata(300, 200);
    const kept = await sharp((await processImageUpload(asFile(small, "image/jpeg"))).bytes).metadata();
    expect(kept.width).toBe(300);
  });

  it("rejects a program renamed to .jpg and a spoofed MIME type", async () => {
    const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(200, 1)]);
    await expect(processImageUpload(asFile(exe, "image/jpeg"))).rejects.toThrowError(new UploadValidationError("unsupported_file_type"));
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).png().toBuffer();
    await expect(processImageUpload(asFile(png, "image/jpeg"))).rejects.toThrowError(new UploadValidationError("mime_mismatch"));
  });

  it("rejects files over the 4 MB cap before decoding", async () => {
    const huge = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(4 * 1024 * 1024 + 1)]);
    await expect(processImageUpload(asFile(huge, "image/jpeg"))).rejects.toThrowError(new UploadValidationError("file_too_large"));
  });
});
