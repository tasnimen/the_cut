import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), getSession: vi.fn(), rate: vi.fn(), upload: vi.fn(), remove: vi.fn(), findOne: vi.fn() }));
class AuthorizationError extends Error { constructor(status = 403) { super("x"); this.status = status; } }

vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal }));
vi.mock("@/lib/auth/server", () => ({ getAuth: async () => ({ api: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/db/mongo", () => ({ ensureApplicationIndexes: async () => {}, getMongo: async () => ({ db: { collection: () => ({ findOne: mocks.findOne }) } }) }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));
vi.mock("@/lib/storage/build-service", () => ({ buildMediaService: () => ({ upload: mocks.upload, delete: mocks.remove }) }));

const { DELETE, POST } = await import("./route");
const MB = 1024 * 1024;

function uploadRequest({ target = "gallery", length, file = new File([new Uint8Array(10)], "a.png", { type: "image/png" }) } = {}) {
  const body = new FormData();
  body.set("target", target);
  body.set("alt", "A photo");
  body.set("file", file);
  const request = new Request("http://localhost/api/media", { method: "POST", body });
  const headers = new Headers(request.headers);
  headers.set("content-length", String(length ?? 500));
  return new Request(request, { headers });
}

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.getSession.mockResolvedValue({ user: { id: "u1" } });
  mocks.requirePrincipal.mockResolvedValue({ id: "u1", role: "ADMIN" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.upload.mockResolvedValue({ id: "m1" });
});

describe("POST /api/media", () => {
  it("rejects guests", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await POST(uploadRequest())).status).toBe(401);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects missing or oversized content length before doing any work", async () => {
    expect((await POST(uploadRequest({ length: 4 * MB + 200 * 1024 }))).status).toBe(413);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("denies a customer for every target except avatar", async () => {
    mocks.requirePrincipal.mockImplementation(async (permission) => {
      if (permission === "mediaAvatarOwn") return { id: "u1", role: "USER" };
      throw new AuthorizationError(403);
    });
    for (const target of ["gallery", "services", "barbers", "banners", "slots", "products"]) {
      expect((await POST(uploadRequest({ target }))).status).toBe(403);
    }
    expect(mocks.upload).not.toHaveBeenCalled();
    expect((await POST(uploadRequest({ target: "avatar" }))).status).toBe(201);
  });

  it("rate limits per user", async () => {
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await POST(uploadRequest())).status).toBe(429);
    expect(mocks.rate).toHaveBeenCalledWith("u1", expect.objectContaining({ bucket: "media-upload" }));
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects unknown targets and files over 4 MB, with generic messages", async () => {
    expect((await POST(uploadRequest({ target: "../../etc" }))).status).toBe(400);
    const big = new File([new Uint8Array(4 * MB + 1)], "a.png", { type: "image/png" });
    const response = await POST(uploadRequest({ file: big, length: 4 * MB + 1000 }));
    expect(response.status).toBe(413);
    expect((await response.json()).message).toMatch(/4 MB/);
  });

  it("returns a generic error when the provider fails, without details", async () => {
    mocks.upload.mockRejectedValue(new Error("secret provider detail"));
    const response = await POST(uploadRequest());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret provider detail");
  });
});

describe("DELETE /api/media", () => {
  const request = (body) => new Request("http://localhost/api/media", { method: "DELETE", body: JSON.stringify(body) });

  it("validates the id, finds the record, checks the permission and deletes through the service", async () => {
    expect((await DELETE(request({ id: "nope" }))).status).toBe(400);
    mocks.findOne.mockResolvedValue(null);
    expect((await DELETE(request({ id: "a".repeat(24) }))).status).toBe(404);
    mocks.findOne.mockResolvedValue({ _id: "x", category: "gallery" });
    mocks.requirePrincipal.mockRejectedValueOnce(new AuthorizationError(403));
    expect((await DELETE(request({ id: "a".repeat(24) }))).status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect((await DELETE(request({ id: "a".repeat(24) }))).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
});
