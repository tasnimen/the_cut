import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), stepUp: vi.fn(), rate: vi.fn(), save: vi.fn(), load: vi.fn() }));
class AuthorizationError extends Error { constructor(status = 403) { super("x"); this.status = status; } }

vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal, requireRecentStepUp: mocks.stepUp }));
vi.mock("@/lib/auth/capabilities", () => ({ saveAdminGrants: mocks.save, loadAdminGrants: mocks.load }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: {} }) }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));

const { saveAdminPermissionsAction } = await import("./actions.js");

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.requirePrincipal.mockResolvedValue({ id: "super-1", role: "SUPER_ADMIN", sessionId: "s1" });
  mocks.stepUp.mockResolvedValue(undefined);
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.save.mockResolvedValue({ ok: true, changed: ["messages.delete"] });
  mocks.load.mockResolvedValue({ "messages.delete": false });
});

describe("saveAdminPermissionsAction", () => {
  it("is Super Admin only: an Admin, a customer or a guest is refused before anything else happens", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(403));
    expect((await saveAdminPermissionsAction({ "messages.delete": false })).code).toBe("denied");
    expect(mocks.requirePrincipal).toHaveBeenCalledWith("securitySettingsManage");
    expect(mocks.stepUp).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("stops at the rate limit", async () => {
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await saveAdminPermissionsAction({})).code).toBe("rate");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("asks for a recent authenticator code and writes nothing without it", async () => {
    mocks.stepUp.mockRejectedValue(new AuthorizationError(403));
    const result = await saveAdminPermissionsAction({ "messages.delete": false });
    expect(result.code).toBe("step_up_required");
    expect(mocks.stepUp).toHaveBeenCalledWith({ id: "super-1", role: "SUPER_ADMIN", sessionId: "s1" });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("saves as the signed-in Super Admin and returns the stored switches", async () => {
    const result = await saveAdminPermissionsAction({ "messages.delete": false });
    expect(result).toMatchObject({ status: "success", code: "saved", changed: 1, grants: { "messages.delete": false } });
    expect(mocks.save).toHaveBeenCalledWith({}, { "messages.delete": false }, "super-1");
  });

  it("reports invalid input without claiming success", async () => {
    mocks.save.mockResolvedValue({ ok: false, error: "unknown_capability" });
    const result = await saveAdminPermissionsAction({ "super.power": true });
    expect(result).toMatchObject({ status: "error", code: "invalid" });
    expect(JSON.stringify(result)).not.toContain("super.power");
  });

  it("says so when nothing changed, and rethrows unexpected errors", async () => {
    mocks.save.mockResolvedValue({ ok: true, changed: [] });
    expect((await saveAdminPermissionsAction({})).message).toMatch(/No changes/);
    mocks.save.mockRejectedValue(new Error("db down"));
    await expect(saveAdminPermissionsAction({})).rejects.toThrow("db down");
  });
});
