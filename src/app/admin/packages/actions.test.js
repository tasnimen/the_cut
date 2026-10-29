import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePrincipal: vi.fn(),
  consume: vi.fn(),
  getMongo: vi.fn(),
  ensureIndexes: vi.fn(),
  revalidate: vi.fn(),
  redirect: vi.fn((path) => { throw new Error(`REDIRECT:${path}`); }),
  listServices: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setActive: vi.fn(),
  importDefaults: vi.fn(),
}));

class AuthorizationError extends Error {
  constructor(status = 403) { super("denied"); this.status = status; }
}

vi.mock("@/lib/auth/authorization", () => ({ requirePrincipal: mocks.requirePrincipal, AuthorizationError }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.consume }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: mocks.getMongo, ensureApplicationIndexes: mocks.ensureIndexes }));
vi.mock("@/lib/catalog/revalidate", () => ({ revalidateCatalog: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/catalog/admin-services", () => ({ listAdminServices: mocks.listServices }));
vi.mock("@/lib/catalog/admin-packages", () => ({ createAdminPackage: mocks.create, updateAdminPackage: mocks.update, setAdminPackageActive: mocks.setActive, importDefaultPackages: mocks.importDefaults }));

const { createPackageAction, importDefaultPackagesAction, setPackageActiveAction, updatePackageAction } = await import("./actions.js");

function form(values, lists = {}) {
  const data = new Map(Object.entries(values));
  return { get: (key) => (data.has(key) ? data.get(key) : null), getAll: (key) => lists[key] ?? [] };
}
const valid = { name: "Gold", note: "n", price: "90", inclusions: "Haircut\nShave", displayOrder: "4", active: "on" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.getMongo.mockResolvedValue({ db: {} });
  mocks.listServices.mockResolvedValue([{ slug: "haircut" }, { slug: "shave" }]);
  mocks.create.mockResolvedValue({ ok: true });
  mocks.update.mockResolvedValue({ ok: true });
  mocks.setActive.mockResolvedValue({ ok: true });
  mocks.importDefaults.mockResolvedValue({ ok: true, count: 3 });
});

describe("package actions: authorization first", () => {
  it("require packagesManageAll on every call and write nothing when denied", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(403));
    const results = [
      await createPackageAction(null, form({ ...valid, slug: "gold" })),
      await updatePackageAction("basic", null, form(valid)),
      await setPackageActiveAction("basic", false),
      await importDefaultPackagesAction(),
    ];
    for (const result of results) expect(result).toMatchObject({ status: "error", code: "denied" });
    for (const call of mocks.requirePrincipal.mock.calls) expect(call).toEqual(["packagesManageAll"]);
    expect(mocks.requirePrincipal).toHaveBeenCalledTimes(4);
    for (const fn of [mocks.create, mocks.update, mocks.setActive, mocks.importDefaults, mocks.revalidate, mocks.getMongo]) expect(fn).not.toHaveBeenCalled();
  });

  it("stops at the rate limit before the database", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfterMs: 1000 });
    expect(await importDefaultPackagesAction()).toMatchObject({ code: "rate" });
    expect(mocks.getMongo).not.toHaveBeenCalled();
  });
});

describe("package actions: validation and effects", () => {
  it("create validates against existing services, writes, revalidates packages and redirects", async () => {
    await expect(createPackageAction(null, form({ ...valid, slug: "gold" }, { bookingServiceSlugs: ["haircut"] }))).rejects.toThrow("REDIRECT:/admin/packages");
    expect(mocks.create).toHaveBeenCalledWith({}, expect.objectContaining({ slug: "gold", priceMinorUnits: 9000, bookingServiceSlugs: ["haircut"], inclusions: ["Haircut", "Shave"] }), "admin-1");
    expect(mocks.revalidate).toHaveBeenCalledWith(["packages"]);
    expect(mocks.ensureIndexes).toHaveBeenCalled();
  });

  it("create rejects unknown services and bad input without writing", async () => {
    const result = await createPackageAction(null, form({ ...valid, slug: "gold" }, { bookingServiceSlugs: ["not-a-service"] }));
    expect(result).toMatchObject({ code: "invalid", fieldErrors: { bookingServiceSlugs: expect.any(String) } });
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.create.mockResolvedValue({ ok: false, error: "slug_taken" });
    expect(await createPackageAction(null, form({ ...valid, slug: "gold" }))).toMatchObject({ code: "duplicate" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("update ignores a slug in the form and rejects a bad bound slug", async () => {
    expect(await updatePackageAction("../x", null, form(valid))).toMatchObject({ code: "not_found" });
    expect(await updatePackageAction("basic", null, form({ ...valid, slug: "evil", role: "SUPER_ADMIN" }))).toMatchObject({ status: "success" });
    expect(mocks.update).toHaveBeenCalledWith({}, "basic", expect.not.objectContaining({ slug: expect.anything(), role: expect.anything() }), "admin-1");
  });

  it("toggle and import behave and only revalidate on success", async () => {
    expect(await setPackageActiveAction("basic", "no")).toMatchObject({ code: "invalid" });
    expect(await setPackageActiveAction("basic", false)).toMatchObject({ code: "deactivated" });
    expect(await importDefaultPackagesAction()).toMatchObject({ status: "success", code: "imported" });
    mocks.importDefaults.mockResolvedValue({ ok: false, error: "not_empty" });
    mocks.revalidate.mockClear();
    expect(await importDefaultPackagesAction()).toMatchObject({ code: "not_empty" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
