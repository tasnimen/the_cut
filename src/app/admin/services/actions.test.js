import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePrincipal: vi.fn(),
  consume: vi.fn(),
  getMongo: vi.fn(),
  revalidate: vi.fn(),
  redirect: vi.fn((path) => { throw new Error(`REDIRECT:${path}`); }),
  create: vi.fn(),
  update: vi.fn(),
  setActive: vi.fn(),
}));

class AuthorizationError extends Error {
  constructor(status = 403) { super("denied"); this.status = status; }
}

vi.mock("@/lib/auth/authorization", () => ({ requirePrincipal: mocks.requirePrincipal, AuthorizationError }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.consume }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: mocks.getMongo }));
vi.mock("@/lib/catalog/revalidate", () => ({ revalidateCatalog: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/catalog/admin-services", () => ({ createAdminService: mocks.create, updateAdminService: mocks.update, setAdminServiceActive: mocks.setActive }));

const { createServiceAction, setServiceActiveAction, updateServiceAction } = await import("./actions.js");

function form(values) {
  const data = new Map(Object.entries(values));
  return { get: (key) => (data.has(key) ? data.get(key) : null) };
}
const valid = { name: "Hot Towel", description: "d", price: "30", durationMinutes: "30", displayOrder: "7", category: "shave", icon: "razor", active: "on" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.getMongo.mockResolvedValue({ db: {} });
  mocks.create.mockResolvedValue({ ok: true });
  mocks.update.mockResolvedValue({ ok: true });
  mocks.setActive.mockResolvedValue({ ok: true });
});

describe("service actions: authorization first", () => {
  it("require the servicesManageAll permission on every call and write nothing when denied", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(403));
    const results = [
      await createServiceAction(null, form({ ...valid, slug: "hot-towel" })),
      await updateServiceAction("haircut", null, form(valid)),
      await setServiceActiveAction("haircut", false),
    ];
    for (const result of results) expect(result).toMatchObject({ status: "error", code: "denied" });
    expect(mocks.requirePrincipal).toHaveBeenCalledTimes(3);
    for (const call of mocks.requirePrincipal.mock.calls) expect(call).toEqual(["servicesManageAll"]);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.setActive).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("stops at the rate limit before touching the database", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfterMs: 1000 });
    expect(await setServiceActiveAction("haircut", true)).toMatchObject({ code: "rate" });
    expect(mocks.getMongo).not.toHaveBeenCalled();
  });
});

describe("service actions: validation and effects", () => {
  it("create validates, writes with the actor id, revalidates and redirects", async () => {
    await expect(createServiceAction(null, form({ ...valid, slug: "hot-towel" }))).rejects.toThrow("REDIRECT:/admin/services");
    expect(mocks.create).toHaveBeenCalledWith({}, expect.objectContaining({ slug: "hot-towel", priceMinorUnits: 3000, active: true }), "admin-1");
    expect(mocks.revalidate).toHaveBeenCalledWith(["services"]);
  });

  it("create returns field errors for bad input and for a taken slug, without revalidating", async () => {
    const bad = await createServiceAction(null, form({ ...valid, slug: "Bad Slug", price: "0" }));
    expect(bad).toMatchObject({ code: "invalid", fieldErrors: { slug: expect.any(String), price: expect.any(String) } });
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.create.mockResolvedValue({ ok: false, error: "slug_taken" });
    expect(await createServiceAction(null, form({ ...valid, slug: "hot-towel" }))).toMatchObject({ code: "duplicate", fieldErrors: { slug: expect.any(String) } });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("update ignores a slug in the form, rejects bad slugs in the bound argument, and revalidates on success", async () => {
    expect(await updateServiceAction("../x", null, form(valid))).toMatchObject({ code: "not_found" });
    expect(mocks.update).not.toHaveBeenCalled();
    const result = await updateServiceAction("haircut", null, form({ ...valid, slug: "evil", role: "SUPER_ADMIN" }));
    expect(result).toMatchObject({ status: "success" });
    expect(mocks.update).toHaveBeenCalledWith({}, "haircut", expect.not.objectContaining({ slug: expect.anything(), role: expect.anything() }), "admin-1");
    expect(mocks.revalidate).toHaveBeenCalledWith(["services"]);
  });

  it("toggle accepts only a boolean and a valid slug", async () => {
    expect(await setServiceActiveAction("haircut", "yes")).toMatchObject({ code: "invalid" });
    expect(await setServiceActiveAction("A B", true)).toMatchObject({ code: "invalid" });
    expect(await setServiceActiveAction("haircut", false)).toMatchObject({ status: "success", code: "deactivated" });
    expect(mocks.setActive).toHaveBeenCalledWith({}, "haircut", false, "admin-1");
  });
});
