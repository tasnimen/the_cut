import { describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES, UploadValidationError, canUploadMedia, inspectImageBytes } from "./upload-policy.js";
import { createMediaService } from "./media-service.js";

function pngBytes(size = 8) {
  const bytes = Buffer.alloc(size);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  return bytes;
}

describe("media upload abuse policy", () => {
  it("allows only the configured management roles and an owner's avatar target", () => {
    expect(canUploadMedia("ADMIN", "gallery")).toBe(true);
    expect(canUploadMedia("SUPER_ADMIN", "services")).toBe(true);
    expect(canUploadMedia("USER", "gallery")).toBe(false);
    expect(canUploadMedia("USER", "avatar")).toBe(true);
    expect(canUploadMedia("GUEST", "avatar")).toBe(false);
  });

  it("rejects an unsupported file type by signature", () => {
    expect(() => inspectImageBytes({ bytes: Buffer.from("not an image"), declaredType: "image/png" }))
      .toThrowError(new UploadValidationError("unsupported_file_type"));
  });

  it("rejects files larger than five MiB", () => {
    expect(() => inspectImageBytes({ bytes: Buffer.alloc(MAX_IMAGE_BYTES + 1), declaredType: "image/png" }))
      .toThrowError(new UploadValidationError("file_too_large"));
  });

  it("rejects a valid signature paired with a spoofed MIME type", () => {
    expect(() => inspectImageBytes({ bytes: pngBytes(), declaredType: "image/jpeg" }))
      .toThrowError(new UploadValidationError("mime_mismatch"));
  });

  it("denies the wrong role before processing or calling mock storage", async () => {
    const processImage = vi.fn();
    const storage = { upload: vi.fn(), delete: vi.fn() };
    const service = createMediaService({ processImage, storage, saveMedia: vi.fn(), deleteMediaRecord: vi.fn() });
    await expect(service.upload({ principal: { id: "user-1", role: "USER" }, target: "gallery", file: {} , alt: "Test" }))
      .rejects.toMatchObject({ status: 403 });
    expect(processImage).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("uses mock storage and never returns the provider delete URL", async () => {
    const storage = {
      upload: vi.fn(async () => ({
        url: "https://i.ibb.co/example/photo.webp",
        displayUrl: "https://i.ibb.co/example/display.webp",
        thumbUrl: "https://i.ibb.co/example/thumb.webp",
        deleteUrl: "https://ibb.co/id/0123456789abcdef0123456789abcdef",
        width: 800,
        height: 600,
      })),
      delete: vi.fn(),
    };
    const service = createMediaService({
      processImage: async () => ({ bytes: Buffer.from("webp"), width: 800, height: 600 }),
      storage,
      saveMedia: async () => "media-id",
      deleteMediaRecord: vi.fn(),
    });
    const media = await service.upload({ principal: { id: "admin-1", role: "ADMIN" }, target: "gallery", file: {}, alt: "Shop interior" });
    expect(media.id).toBe("media-id");
    expect(media.mimeType).toBe("image/webp");
    expect(media).not.toHaveProperty("deleteUrl");
    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/webp" }));
  });
});
