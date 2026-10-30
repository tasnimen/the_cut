import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePrincipal: vi.fn(),
  consume: vi.fn(),
  getMongo: vi.fn(),
  ensureIndexes: vi.fn(),
  revalidate: vi.fn(),
  save: vi.fn(),
}));

class AuthorizationError extends Error {
  constructor(status = 403) { super("denied"); this.status = status; }
}

vi.mock("@/lib/auth/authorization", () => ({ requirePrincipal: mocks.requirePrincipal, AuthorizationError }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.consume }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: mocks.getMongo, ensureApplicationIndexes: mocks.ensureIndexes }));
vi.mock("@/lib/catalog/revalidate", () => ({ revalidateCatalog: mocks.revalidate }));
vi.mock("@/lib/catalog/admin-settings", () => ({ saveSetting: mocks.save }));

const { saveContactAction, saveHolidaysAction, saveHoursAction, saveSocialAction } = await import("./actions.js");

const form = (values) => { const data = new Map(Object.entries(values)); return { get: (key) => (data.has(key) ? data.get(key) : null) }; };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.getMongo.mockResolvedValue({ db: {} });
  mocks.save.mockResolvedValue({ ok: true });
});

describe("settings actions: authorization first", () => {
  it("require businessSettingsManage on every call and write nothing when denied", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(403));
    const results = [
      await saveHoursAction(null, form({ day_monday_works: "on", day_monday_open: "09:00", day_monday_close: "17:00" })),
      await saveHolidaysAction(null, form({})),
      await saveContactAction(null, form({ phone: "+1 212 555 0100" })),
      await saveSocialAction(null, form({})),
    ];
    for (const result of results) expect(result).toMatchObject({ status: "error", code: "denied" });
    expect(mocks.requirePrincipal.mock.calls).toEqual([["businessSettingsManage",{"capability":"settings.edit"}],["businessSettingsManage",{"capability":"settings.edit"}],["businessSettingsManage",{"capability":"settings.edit"}],["businessSettingsManage",{"capability":"settings.edit"}]]);
    expect(mocks.requirePrincipal).toHaveBeenCalledTimes(4);
    for (const fn of [mocks.save, mocks.revalidate, mocks.getMongo]) expect(fn).not.toHaveBeenCalled();
  });

  it("stops at the rate limit before the database", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfterMs: 1 });
    expect(await saveSocialAction(null, form({}))).toMatchObject({ code: "rate" });
    expect(mocks.getMongo).not.toHaveBeenCalled();
  });
});

describe("settings actions: validation and effects", () => {
  it("saves each setting under its own key, audits through saveSetting, and revalidates settings", async () => {
    expect(await saveHoursAction(null, form({ day_monday_works: "on", day_monday_open: "09:00", day_monday_close: "17:00" }))).toMatchObject({ status: "success" });
    expect(mocks.save).toHaveBeenLastCalledWith({}, "hours", { monday: { open: "09:00", close: "17:00" } }, "admin-1");
    await saveContactAction(null, form({ phone: "+1 212 555 0100", email: "hi@the-cut.example" }));
    expect(mocks.save).toHaveBeenLastCalledWith({}, "contact", expect.objectContaining({ phone: "+1 212 555 0100", email: "hi@the-cut.example", streetAddress: null }), "admin-1");
    await saveHolidaysAction(null, form({ thanksgiving: "on", additionalClosedDates: "2027-01-02" }));
    expect(mocks.save).toHaveBeenLastCalledWith({}, "holidays", expect.objectContaining({ thanksgiving: true, additionalClosedDates: ["2027-01-02"] }), "admin-1");
    await saveSocialAction(null, form({ instagram: "https://instagram.com/thecut" }));
    expect(mocks.save).toHaveBeenLastCalledWith({}, "social", expect.objectContaining({ instagram: "https://instagram.com/thecut", facebook: null }), "admin-1");
    expect(mocks.save).toHaveBeenCalledTimes(4);
    for (const call of mocks.revalidate.mock.calls) expect(call).toEqual([["settings"]]);
  });

  it("returns field errors and the typed values for bad input, and writes nothing", async () => {
    const bad = await saveSocialAction(null, form({ instagram: "javascript:alert(1)", facebook: "https://evil.example/x" }));
    expect(bad).toMatchObject({ code: "invalid", fieldErrors: { instagram: expect.any(String), facebook: expect.any(String) }, values: { instagram: "javascript:alert(1)" } });
    expect(await saveContactAction(null, form({ phone: "call me" }))).toMatchObject({ code: "invalid" });
    expect(await saveHoursAction(null, form({}))).toMatchObject({ code: "invalid" });
    expect(await saveHolidaysAction(null, form({ additionalClosedDates: "2027-02-30" }))).toMatchObject({ code: "invalid" });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("ignores unknown form keys (mass assignment)", async () => {
    await saveContactAction(null, form({ phone: "+1 212 555 0100", role: "SUPER_ADMIN", key: "holidays", _id: "x" }));
    const value = mocks.save.mock.calls[0][2];
    expect(Object.keys(value).sort()).toEqual(["email", "phone", "postalCode", "streetAddress"]);
    expect(mocks.save.mock.calls[0][1]).toBe("contact");
  });
});
