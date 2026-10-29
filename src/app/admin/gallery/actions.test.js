import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), rate: vi.fn(), update: vi.fn(), active: vi.fn(), remove: vi.fn(), revalidate: vi.fn() }));
class AuthorizationError extends Error {}

vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: {} }) }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));
vi.mock("@/lib/catalog/revalidate", () => ({ revalidateCatalog: mocks.revalidate }));
vi.mock("@/lib/gallery/media", () => ({ removeGalleryMedia: vi.fn() }));
vi.mock("@/lib/gallery/admin-gallery", () => ({ updateGalleryItem: mocks.update, setGalleryItemActive: mocks.active, deleteGalleryItem: mocks.remove }));

const { deleteGalleryItemAction, setGalleryActiveAction, updateGalleryItemAction } = await import("./actions");
const ID = "a".repeat(24);
const meta = { title: "Skin fade", category: "Haircuts", alt: "A skin fade from the side" };

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.update.mockResolvedValue({ ok: true });
  mocks.active.mockResolvedValue({ ok: true });
  mocks.remove.mockResolvedValue({ ok: true });
});

describe("gallery actions", () => {
  it("do nothing without mediaGalleryManageAll, or when rate limited", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError());
    expect((await updateGalleryItemAction(ID, meta)).code).toBe("denied");
    expect((await setGalleryActiveAction(ID, true)).code).toBe("denied");
    expect((await deleteGalleryItemAction(ID)).code).toBe("denied");
    mocks.requirePrincipal.mockResolvedValue({ id: "admin-1" });
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await deleteGalleryItemAction(ID)).code).toBe("rate");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("validate text fields and reject smuggled keys such as an image address", async () => {
    expect((await updateGalleryItemAction(ID, { ...meta, title: "" })).fieldErrors.title).toBeTruthy();
    expect((await updateGalleryItemAction(ID, { ...meta, displayUrl: "https://evil.example/x.png" })).code).toBe("invalid");
    expect((await setGalleryActiveAction(ID, "yes")).code).toBe("invalid");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("save, show or hide, and refresh the public gallery", async () => {
    expect((await updateGalleryItemAction(ID, meta)).status).toBe("success");
    expect(mocks.update).toHaveBeenCalledWith({}, ID, meta, "admin-1");
    expect((await setGalleryActiveAction(ID, false)).status).toBe("success");
    expect(mocks.revalidate).toHaveBeenCalledWith(["gallery"]);
  });

  it("tell the admin when the image service refused to delete, and report missing photos", async () => {
    mocks.remove.mockResolvedValue({ ok: false, error: "provider_failed" });
    expect((await deleteGalleryItemAction(ID)).message).toMatch(/nothing was removed/);
    mocks.remove.mockResolvedValue({ ok: false, error: "not_found" });
    expect((await deleteGalleryItemAction(ID)).code).toBe("not_found");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
