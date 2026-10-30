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
  readPicture: vi.fn(),
  savePicture: vi.fn(),
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
vi.mock("@/lib/catalog/admin-barbers", () => ({ createAdminBarber: mocks.create, updateAdminBarber: mocks.update, setAdminBarberActive: mocks.setActive }));

vi.mock("@/lib/catalog/image-action", () => ({ readPicture: mocks.readPicture, savePicture: mocks.savePicture, PICTURE_FAILED_MESSAGE: "picture failed" }));

const { createBarberAction, setBarberActiveAction, updateBarberAction } = await import("./actions.js");

function form(values, lists = { serviceSlugs: ["haircut"] }) {
  const data = new Map(Object.entries(values));
  return { get: (key) => (data.has(key) ? data.get(key) : null), getAll: (key) => lists[key] ?? [] };
}
const valid = { name: "Mike", active: "on", displayOrder: "5", day_monday_works: "on", day_monday_open: "09:00", day_monday_close: "17:00" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readPicture.mockResolvedValue({ ok: true, fields: { mediaId: null, alt: "", remove: false } });
  mocks.savePicture.mockResolvedValue({ ok: true });
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.getMongo.mockResolvedValue({ db: {} });
  mocks.listServices.mockResolvedValue([{ slug: "haircut" }, { slug: "shave" }]);
  mocks.create.mockResolvedValue({ ok: true });
  mocks.update.mockResolvedValue({ ok: true });
  mocks.setActive.mockResolvedValue({ ok: true });
});

describe("barber actions: authorization first", () => {
  it("require barbersManageAll on every call and write nothing when denied", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(403));
    const results = [
      await createBarberAction(null, form({ ...valid, slug: "mike" })),
      await updateBarberAction("daniel-carter", null, form(valid)),
      await setBarberActiveAction("daniel-carter", false),
    ];
    for (const result of results) expect(result).toMatchObject({ status: "error", code: "denied" });
    expect(mocks.requirePrincipal.mock.calls).toEqual([["barbersManageAll",{"capability":"barbers.create"}],["barbersManageAll",{"capability":"barbers.edit"}],["barbersManageAll",{"capability":"barbers.edit"}]]);
    expect(mocks.requirePrincipal).toHaveBeenCalledTimes(3);
    for (const fn of [mocks.create, mocks.update, mocks.setActive, mocks.revalidate, mocks.getMongo]) expect(fn).not.toHaveBeenCalled();
  });

  it("stops at the rate limit before the database", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfterMs: 1 });
    expect(await setBarberActiveAction("daniel-carter", true)).toMatchObject({ code: "rate" });
    expect(mocks.getMongo).not.toHaveBeenCalled();
  });
});

describe("barber actions: validation and effects", () => {
  it("create validates against existing services, writes, revalidates and redirects", async () => {
    await expect(createBarberAction(null, form({ ...valid, slug: "mike" }))).rejects.toThrow("REDIRECT:/admin/barbers");
    expect(mocks.create).toHaveBeenCalledWith({}, expect.objectContaining({ slug: "mike", serviceSlugs: ["haircut"], weeklySchedule: { monday: { open: "09:00", close: "17:00" } } }), "admin-1");
    expect(mocks.revalidate).toHaveBeenCalledWith(["barbers"]);
  });

  it("returns field errors, keeps what was typed, and writes nothing for bad input", async () => {
    const result = await createBarberAction(null, form({ ...valid, slug: "mike", day_monday_open: "09:10" }));
    expect(result).toMatchObject({ code: "invalid", fieldErrors: { day_monday: expect.any(String) }, values: { name: "Mike" } });
    const unknownService = await createBarberAction(null, form({ ...valid, slug: "mike" }, { serviceSlugs: ["nope"] }));
    expect(unknownService.fieldErrors.serviceSlugs).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.create.mockResolvedValue({ ok: false, error: "slug_taken" });
    expect(await createBarberAction(null, form({ ...valid, slug: "mike" }))).toMatchObject({ code: "duplicate" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("update ignores a slug in the form, rejects a bad bound slug, and says appointments are not moved", async () => {
    expect(await updateBarberAction("../x", null, form(valid))).toMatchObject({ code: "not_found" });
    const result = await updateBarberAction("daniel-carter", null, form({ ...valid, slug: "evil", role_admin: "x" }));
    expect(result).toMatchObject({ status: "success", message: expect.stringContaining("not moved") });
    expect(mocks.update).toHaveBeenCalledWith({}, "daniel-carter", expect.not.objectContaining({ slug: expect.anything() }), "admin-1");
  });

  it("toggle accepts only a boolean and a valid slug", async () => {
    expect(await setBarberActiveAction("daniel-carter", "yes")).toMatchObject({ code: "invalid" });
    expect(await setBarberActiveAction("A B", true)).toMatchObject({ code: "invalid" });
    expect(await setBarberActiveAction("daniel-carter", false)).toMatchObject({ status: "success", code: "deactivated" });
  });
});
