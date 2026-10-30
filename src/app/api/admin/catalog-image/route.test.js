import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), rate: vi.fn(), upload: vi.fn(), sweep: vi.fn(), discard: vi.fn() }));
class AuthorizationError extends Error { constructor(status = 403) { super("x"); this.status = status; } }

vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: {} }) }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));
vi.mock("@/lib/gallery/media", () => ({ buildMediaService: () => ({ upload: mocks.upload }), removeGalleryMedia: vi.fn() }));
vi.mock("@/lib/catalog/catalog-images", async (original) => ({ ...(await original()), sweepStaleMedia: mocks.sweep, discardPendingMedia: mocks.discard }));

const { DELETE, POST } = await import("./route");
const MB = 1024 * 1024;
const ID = "a".repeat(24);

function upload({ kind = "services", length = 600, file = new File([new Uint8Array(10)], "a.webp", { type: "image/webp" }) } = {}) {
  const body = new FormData();
  if (kind !== null) body.set("kind", kind);
  body.set("file", file);
  const request = new Request("http://localhost/api/admin/catalog-image", { method: "POST", body });
  const headers = new Headers(request.headers);
  headers.set("content-length", String(length));
  return new Request(request, { headers });
}

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.upload.mockResolvedValue({ id: "m1", secureUrl: "https://res.cloudinary.com/demo/x.webp", width: 640, height: 480 });
  mocks.sweep.mockResolvedValue({ removed: 0 });
});

describe("POST /api/admin/catalog-image", () => {
  it("stores a pending picture and returns only what the form needs", async () => {
    const response = await POST(upload());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ mediaId: "m1", url: "https://res.cloudinary.com/demo/x.webp", width: 640, height: 480 });
    expect(mocks.requirePrincipal).toHaveBeenCalledWith("mediaServicesManageAll", { capability: ["services.create", "services.edit"] });
    expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({ target: "services" }));
  });

  it("uses the permission of each kind", async () => {
    await POST(upload({ kind: "barbers" }));
    await POST(upload({ kind: "packages" }));
    expect(mocks.requirePrincipal.mock.calls).toEqual([["mediaBarbersManageAll", { capability: ["barbers.create", "barbers.edit"] }], ["mediaPackagesManageAll", { capability: ["packages.create", "packages.edit"] }]]);
  });

  it("refuses customers and guests without uploading", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(403));
    expect((await POST(upload())).status).toBe(403);
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(401));
    expect((await POST(upload())).status).toBe(401);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects unknown kinds and missing files, with no path or provider details", async () => {
    for (const kind of ["gallery", "avatar", "../etc", "", null]) expect((await POST(upload({ kind }))).status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("enforces the 4 MB cap and the per-user rate limit", async () => {
    expect((await POST(upload({ length: 4 * MB + 200 * 1024 }))).status).toBe(413);
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await POST(upload())).status).toBe(429);
    expect(mocks.rate).toHaveBeenCalledWith("admin-1", expect.objectContaining({ bucket: "admin-catalog-image" }));
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("hides provider errors", async () => {
    mocks.upload.mockRejectedValue(new Error("secret provider detail"));
    const response = await POST(upload());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});

describe("DELETE /api/admin/catalog-image", () => {
  const request = (body) => new Request("http://localhost/api/admin/catalog-image", { method: "DELETE", body: JSON.stringify(body) });

  it("discards a pending picture only for a valid kind and id, after checking the permission", async () => {
    mocks.discard.mockResolvedValue({ ok: true });
    expect((await DELETE(request({ kind: "services", mediaId: ID }))).status).toBe(200);
    expect(mocks.requirePrincipal).toHaveBeenCalledWith("mediaServicesManageAll", { capability: ["services.create", "services.edit"] });
    expect((await DELETE(request({ kind: "services", mediaId: "../x" }))).status).toBe(400);
    expect((await DELETE(request({ kind: "gallery", mediaId: ID }))).status).toBe(400);
    expect((await DELETE(request({ kind: "services", mediaId: ID, extra: 1 }))).status).toBe(400);
  });

  it("refuses an attached picture and a customer", async () => {
    mocks.discard.mockResolvedValue({ ok: false, error: "attached" });
    expect((await DELETE(request({ kind: "services", mediaId: ID }))).status).toBe(409);
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(403));
    expect((await DELETE(request({ kind: "services", mediaId: ID }))).status).toBe(403);
  });
});
