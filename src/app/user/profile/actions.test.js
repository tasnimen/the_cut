import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePrincipal: vi.fn(),
  rate: vi.fn(),
  api: { updateUser: vi.fn(), changePassword: vi.fn(), listSessions: vi.fn(), revokeSession: vi.fn(), revokeOtherSessions: vi.fn() },
  audit: vi.fn(),
}));

class AuthorizationError extends Error {}
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal }));
vi.mock("@/lib/auth/server", () => ({ getAuth: async () => ({ api: mocks.api }) }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: {} }) }));
vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: mocks.audit }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));

const { changePasswordAction, revokeOtherSessionsAction, revokeSessionAction, updateProfileAction } = await import("./actions");
const principal = { id: "u1", sessionId: "current-session" };
const form = (values) => { const data = new FormData(); Object.entries(values).forEach(([k, v]) => data.set(k, v)); return data; };

beforeEach(() => {
  Object.values(mocks.api).forEach((fn) => fn.mockReset());
  mocks.audit.mockReset();
  mocks.requirePrincipal.mockReset().mockResolvedValue(principal);
  mocks.rate.mockReset().mockResolvedValue({ allowed: true });
});

describe("account actions", () => {
  it("do nothing when the caller is not allowed", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError());
    expect((await updateProfileAction({}, form({ name: "Sam Carter" }))).code).toBe("denied");
    expect((await changePasswordAction({}, form({}))).code).toBe("denied");
    expect((await revokeSessionAction("abcdefgh12")).code).toBe("denied");
    expect((await revokeOtherSessionsAction()).code).toBe("denied");
    expect(mocks.api.updateUser).not.toHaveBeenCalled();
    expect(mocks.api.changePassword).not.toHaveBeenCalled();
  });

  it("stop when rate limited", async () => {
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await updateProfileAction({}, form({ name: "Sam Carter" }))).code).toBe("rate");
    expect(mocks.api.updateUser).not.toHaveBeenCalled();
  });

  it("update only the validated name and audit it", async () => {
    const result = await updateProfileAction({}, form({ name: " Sam Carter ", role: "ADMIN" }));
    expect(result.status).toBe("success");
    expect(mocks.api.updateUser.mock.calls[0][0].body).toEqual({ name: "Sam Carter" });
    expect(mocks.audit.mock.calls[0][1]).toMatchObject({ actorId: "u1", action: "account.profile.updated" });
  });

  it("reject an invalid name without calling the auth API", async () => {
    const result = await updateProfileAction({}, form({ name: "<script>" }));
    expect(result.fieldErrors.name).toBeTruthy();
    expect(mocks.api.updateUser).not.toHaveBeenCalled();
  });

  it("change the password with other sessions revoked, and never audit the password", async () => {
    const result = await changePasswordAction({}, form({ currentPassword: "old-password-1", newPassword: "new-password-22", confirm: "new-password-22" }));
    expect(result.status).toBe("success");
    expect(mocks.api.changePassword.mock.calls[0][0].body).toEqual({ currentPassword: "old-password-1", newPassword: "new-password-22", revokeOtherSessions: true });
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toMatch(/password-/);
  });

  it("report a wrong current password as a field error and audit the failure", async () => {
    const apiError = Object.assign(new Error("bad"), { name: "APIError", status: 400 });
    mocks.api.changePassword.mockRejectedValue(apiError);
    const result = await changePasswordAction({}, form({ currentPassword: "wrong-password", newPassword: "new-password-22", confirm: "new-password-22" }));
    expect(result.fieldErrors.currentPassword).toBeTruthy();
    expect(mocks.audit.mock.calls[0][1]).toMatchObject({ action: "account.password.change_failed", outcome: "failure" });
  });

  it("rethrow unexpected password errors", async () => {
    mocks.api.changePassword.mockRejectedValue(new Error("db down"));
    await expect(changePasswordAction({}, form({ currentPassword: "old-password-1", newPassword: "new-password-22", confirm: "new-password-22" }))).rejects.toThrow("db down");
  });

  it("revoke only the caller's own sessions and never the current one", async () => {
    mocks.api.listSessions.mockResolvedValue([{ id: "other-session-1", token: "tok-1" }]);
    expect((await revokeSessionAction("current-session")).code).toBe("current");
    expect((await revokeSessionAction("not-mine-12345")).code).toBe("not_found");
    expect(mocks.api.revokeSession).not.toHaveBeenCalled();
    expect((await revokeSessionAction("other-session-1")).status).toBe("success");
    expect(mocks.api.revokeSession.mock.calls[0][0].body).toEqual({ token: "tok-1" });
  });

  it("reject malformed session ids", async () => {
    expect((await revokeSessionAction({ $ne: "" })).code).toBe("not_found");
    expect(mocks.api.listSessions).not.toHaveBeenCalled();
  });
});
