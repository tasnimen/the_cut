import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ check: vi.fn(), save: vi.fn(), removeGalleryMedia: vi.fn(), findOne: vi.fn() }));
vi.mock("@/lib/catalog/catalog-images", async (original) => ({ ...(await original()), checkPendingImage: mocks.check, saveImageForRecord: mocks.save }));
vi.mock("@/lib/gallery/media", () => ({ removeGalleryMedia: mocks.removeGalleryMedia }));

const { readPicture, savePicture } = await import("./image-action.js");
const ID = "a".repeat(24);
const db = { collection: () => ({ findOne: mocks.findOne }) };
const form = (values) => ({ get: (key) => values[key] ?? null });

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.check.mockResolvedValue({ ok: true });
  mocks.save.mockResolvedValue({ ok: true });
  mocks.findOne.mockResolvedValue({ image: { mediaId: "old", secureUrl: "https://i.ibb.co/x/y.webp", alt: "Old text here" } });
});

describe("readPicture: role matrix and checks", () => {
  const change = form({ imageMediaId: ID, imageAlt: "A skin fade" });

  it("lets ADMIN and SUPER_ADMIN change pictures of every kind", async () => {
    for (const role of ["ADMIN", "SUPER_ADMIN"]) {
      for (const kind of ["services", "barbers", "packages"]) {
        expect((await readPicture(db, { kind, slug: "x", formData: change, principal: { id: "u", role } })).ok).toBe(true);
      }
    }
  });

  it("denies a customer or a guest who tries to add or remove a picture", async () => {
    for (const role of ["USER", "GUEST", undefined]) {
      for (const formData of [change, form({ removeImage: "on" })]) {
        expect(await readPicture(db, { kind: "services", slug: "x", formData, principal: { id: "u", role } })).toEqual({ ok: false, denied: true });
      }
    }
    expect(mocks.check).not.toHaveBeenCalled();
  });

  it("reports an unusable upload and bad text as field errors, without touching anything", async () => {
    mocks.check.mockResolvedValue({ ok: false, error: "media_not_available" });
    const gone = await readPicture(db, { kind: "services", slug: "x", formData: change, principal: { id: "u", role: "ADMIN" } });
    expect(gone.ok).toBe(false);
    expect(gone.fieldErrors.image).toMatch(/Add the picture again/);
    const noAlt = await readPicture(db, { kind: "services", slug: "x", formData: form({ imageMediaId: ID, imageAlt: "" }), principal: { id: "u", role: "ADMIN" } });
    expect(noAlt.fieldErrors.imageAlt).toBeTruthy();
  });

  it("needs no picture permission when the form carries no picture change", async () => {
    expect((await readPicture(db, { kind: "services", slug: "x", formData: form({}), principal: { id: "u", role: "ADMIN" } })).ok).toBe(true);
  });
});

describe("savePicture", () => {
  it("does nothing when the form asks for no change", async () => {
    expect(await savePicture(db, { kind: "services", slug: "x", fields: { mediaId: null, alt: "", remove: false }, principal: { id: "a", role: "ADMIN" } })).toEqual({ ok: true });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("applies a new picture as the signed-in admin and wires old-asset deletion", async () => {
    await savePicture(db, { kind: "barbers", slug: "alex", fields: { mediaId: ID, alt: "A portrait", remove: false }, principal: { id: "admin-1", role: "ADMIN" } });
    const call = mocks.save.mock.calls[0][1];
    expect(call).toMatchObject({ kind: "barbers", slug: "alex", actorId: "admin-1", fields: { mediaId: ID } });
    await call.removeMedia("old");
    expect(mocks.removeGalleryMedia).toHaveBeenCalledWith(db, { id: "admin-1", role: "ADMIN" }, "old");
  });
});
