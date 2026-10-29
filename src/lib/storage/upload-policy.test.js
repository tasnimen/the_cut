import { describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES, UploadValidationError, canUploadMedia, getMediaTargetRule, inspectImageBytes } from "./upload-policy.js";
import { createMediaService } from "./media-service.js";
import { toPublicMediaRecord } from "./media-model.js";

function pngBytes(size = 8) {
  const bytes = Buffer.alloc(size);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  return bytes;
}

const ID = "11111111-2222-3333-4444-555555555555";
const remoteFor = (folder) => ({
  provider: "cloudinary", publicId: `${folder}/${ID}`, resourceType: "image",
  secureUrl: `https://res.cloudinary.com/demo-cloud/image/upload/v1/${folder}/${ID}.webp`, width: 800, height: 600, format: "webp", bytes: 4, folder,
});

function serviceWith(overrides = {}) {
  const storage = { upload: vi.fn(async ({ folder }) => remoteFor(folder)), delete: vi.fn(async () => true) };
  const audit = vi.fn(async () => {});
  const deleteMediaRecord = vi.fn(async () => {});
  const saved = [];
  const service = createMediaService({
    processImage: vi.fn(async () => ({ bytes: Buffer.from("webp"), width: 800, height: 600 })),
    storage,
    saveMedia: async (record) => { saved.push(record); return "media-id"; },
    deleteMediaRecord,
    audit,
    ...overrides,
  });
  return { service, storage, audit, deleteMediaRecord, saved };
}

describe("media upload abuse policy", () => {
  it("has a 4 MB cap", () => {
    expect(MAX_IMAGE_BYTES).toBe(4 * 1024 * 1024);
  });

  it("role matrix: guests never; a customer only their own avatar; admins everything else", () => {
    const targets = ["gallery", "products", "barbers", "services", "banners", "slots"];
    for (const target of targets) {
      expect(canUploadMedia("GUEST", target)).toBe(false);
      expect(canUploadMedia("USER", target)).toBe(false);
      expect(canUploadMedia("ADMIN", target)).toBe(true);
      expect(canUploadMedia("SUPER_ADMIN", target)).toBe(true);
    }
    expect(canUploadMedia("GUEST", "avatar")).toBe(false);
    for (const role of ["USER", "ADMIN", "SUPER_ADMIN"]) expect(canUploadMedia(role, "avatar")).toBe(true);
    expect(canUploadMedia("ADMIN", "unknown")).toBe(false);
    expect(canUploadMedia(undefined, "gallery")).toBe(false);
  });

  it("maps each target to a fixed folder", () => {
    const folders = Object.fromEntries(["avatar", "barbers", "services", "gallery", "banners", "slots", "products"].map((target) => [target, getMediaTargetRule(target).folder]));
    expect(folders).toEqual({ avatar: "the-cut/avatars", barbers: "the-cut/barbers", services: "the-cut/services", gallery: "the-cut/gallery", banners: "the-cut/banners", slots: "the-cut/slots", products: "the-cut/products" });
  });

  it("rejects an unsupported file type by signature", () => {
    expect(() => inspectImageBytes({ bytes: Buffer.from("not an image"), declaredType: "image/png" })).toThrowError(new UploadValidationError("unsupported_file_type"));
    const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(64)]);
    expect(() => inspectImageBytes({ bytes: exe, declaredType: "image/jpeg" })).toThrowError(new UploadValidationError("unsupported_file_type"));
  });

  it("rejects files larger than four MiB and empty files", () => {
    expect(() => inspectImageBytes({ bytes: Buffer.alloc(MAX_IMAGE_BYTES + 1), declaredType: "image/png" })).toThrowError(new UploadValidationError("file_too_large"));
    expect(() => inspectImageBytes({ bytes: Buffer.alloc(0), declaredType: "image/png" })).toThrowError(new UploadValidationError("empty_file"));
  });

  it("rejects a valid signature paired with a spoofed MIME type", () => {
    expect(() => inspectImageBytes({ bytes: pngBytes(), declaredType: "image/jpeg" })).toThrowError(new UploadValidationError("mime_mismatch"));
  });

  it("denies the wrong role before processing or calling storage", async () => {
    const { service, storage } = serviceWith();
    await expect(service.upload({ principal: { id: "user-1", role: "USER" }, target: "gallery", file: {}, alt: "Test" })).rejects.toMatchObject({ status: 403 });
    await expect(service.upload({ principal: undefined, target: "avatar", file: {}, alt: "Test" })).rejects.toMatchObject({ status: 403 });
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe("media service with a mock storage adapter", () => {
  it("uploads to the target's fixed folder, saves a provider-neutral record and audits it", async () => {
    const { service, storage, saved, audit } = serviceWith();
    const media = await service.upload({ principal: { id: "admin-1", role: "ADMIN" }, target: "gallery", file: {}, alt: " Shop interior " });
    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ folder: "the-cut/gallery", mimeType: "image/webp" }));
    expect(saved[0]).toMatchObject({ provider: "cloudinary", publicId: `the-cut/gallery/${ID}`, resourceType: "image", folder: "the-cut/gallery", category: "gallery", ownerId: null, uploadedBy: "admin-1", alt: "Shop interior", width: 800, height: 600, format: "webp" });
    expect(media).toMatchObject({ id: "media-id", secureUrl: remoteFor("the-cut/gallery").secureUrl, category: "gallery" });
    expect(media).not.toHaveProperty("publicId");
    expect(media).not.toHaveProperty("deleteUrl");
    expect(audit).toHaveBeenCalledWith({ action: "media.uploaded", mediaId: "media-id", category: "gallery" });
  });

  it("records the owner of an avatar", async () => {
    const { service, saved } = serviceWith();
    await service.upload({ principal: { id: "user-1", role: "USER" }, target: "avatar", file: {}, alt: "Sam profile photo" });
    expect(saved[0]).toMatchObject({ category: "avatar", ownerId: "user-1", folder: "the-cut/avatars" });
  });

  it("removes the stored file again when saving the record fails", async () => {
    const { service, storage } = serviceWith({ saveMedia: async () => { throw new Error("db"); } });
    await expect(service.upload({ principal: { id: "admin-1", role: "ADMIN" }, target: "gallery", file: {}, alt: "x" })).rejects.toThrow("media_save_failed");
    expect(storage.delete).toHaveBeenCalledWith(expect.objectContaining({ publicId: `the-cut/gallery/${ID}` }));
  });

  it("deletes by the record (public id), then the record, and audits it", async () => {
    const { service, storage, deleteMediaRecord, audit } = serviceWith();
    const record = { _id: "m1", category: "gallery", ownerId: null, provider: "cloudinary", publicId: `the-cut/gallery/${ID}` };
    await expect(service.delete({ principal: { id: "admin-1", role: "ADMIN" }, record })).resolves.toEqual({ deleted: true });
    expect(storage.delete).toHaveBeenCalledWith(record);
    expect(deleteMediaRecord).toHaveBeenCalledWith("m1");
    expect(audit).toHaveBeenCalledWith({ action: "media.deleted", mediaId: "m1", category: "gallery" });
  });

  it("keeps the record when the provider refuses, and enforces ownership and roles on delete", async () => {
    const failing = serviceWith({ storage: { upload: vi.fn(), delete: vi.fn(async () => { throw new Error("provider"); }) } });
    const record = { _id: "m1", category: "gallery", ownerId: null, publicId: `the-cut/gallery/${ID}` };
    await expect(failing.service.delete({ principal: { id: "admin-1", role: "ADMIN" }, record })).rejects.toThrow("provider");
    expect(failing.deleteMediaRecord).not.toHaveBeenCalled();

    const { service, storage } = serviceWith();
    const avatar = { _id: "a1", category: "avatar", ownerId: "user-1", publicId: `the-cut/avatars/${ID}` };
    await expect(service.delete({ principal: { id: "user-2", role: "USER" }, record: avatar })).rejects.toMatchObject({ status: 403 });
    await expect(service.delete({ principal: { id: "user-1", role: "USER" }, record })).rejects.toMatchObject({ status: 403 });
    await expect(service.delete({ principal: { id: "admin-1", role: "ADMIN" }, record: { ...record, category: "nope" } })).rejects.toMatchObject({ status: 403 });
    expect(storage.delete).not.toHaveBeenCalled();
    await expect(service.delete({ principal: { id: "user-1", role: "USER" }, record: avatar })).resolves.toEqual({ deleted: true });
  });
});

describe("toPublicMediaRecord", () => {
  it("exposes the address for new and legacy records but never provider internals", () => {
    const modern = toPublicMediaRecord("1", { category: "gallery", secureUrl: "https://res.cloudinary.com/c/x.webp", publicId: "the-cut/gallery/x", width: 1, height: 1, bytes: 2, alt: "a", createdAt: new Date(0) });
    expect(modern).toMatchObject({ secureUrl: "https://res.cloudinary.com/c/x.webp", displayUrl: "https://res.cloudinary.com/c/x.webp" });
    expect(modern).not.toHaveProperty("publicId");
    const legacy = toPublicMediaRecord("2", { category: "gallery", displayUrl: "https://i.ibb.co/a.webp", deleteUrl: "https://ibb.co/x/y", byteSize: 5, width: 1, height: 1, alt: "a", createdAt: new Date(0) });
    expect(legacy.secureUrl).toBe("https://i.ibb.co/a.webp");
    expect(legacy).not.toHaveProperty("deleteUrl");
    expect(legacy.bytes).toBe(5);
  });
});
