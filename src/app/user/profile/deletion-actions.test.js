import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePrincipal: vi.fn(),
  rate: vi.fn(),
  getSession: vi.fn(),
  audit: vi.fn(),
  request: vi.fn(),
  cancel: vi.fn(),
}));

class AuthorizationError extends Error {}
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal }));
vi.mock("@/lib/auth/server", () => ({ getAuth: async () => ({ api: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: {} }) }));
vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: mocks.audit }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));
vi.mock("@/lib/account/deletion-request", async (original) => ({ ...(await original()), requestDeletion: mocks.request, cancelDeletionRequest: mocks.cancel }));

const { cancelDeletionAction, requestDeletionAction } = await import("./deletion-actions");
const form = (values) => { const data = new FormData(); Object.entries(values).forEach(([k, v]) => data.set(k, v)); return data; };

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.requirePrincipal.mockResolvedValue({ id: "u1" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.getSession.mockResolvedValue({ user: { email: "sam@example.com" } });
  mocks.cancel.mockResolvedValue({ cancelled: true });
});

describe("deletion request actions", () => {
  it("do nothing when the caller is not allowed or rate limited", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError());
    expect((await requestDeletionAction({}, form({ confirm: "sam@example.com" }))).code).toBe("denied");
    expect((await cancelDeletionAction()).code).toBe("denied");
    mocks.requirePrincipal.mockResolvedValue({ id: "u1" });
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await requestDeletionAction({}, form({ confirm: "sam@example.com" }))).code).toBe("rate");
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("require the typed email to match the session email", async () => {
    const result = await requestDeletionAction({}, form({ confirm: "someone@else.com" }));
    expect(result.fieldErrors.confirm).toBeTruthy();
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("record the request for the signed-in user only and audit it", async () => {
    const result = await requestDeletionAction({}, form({ confirm: " SAM@example.com ", userId: "other" }));
    expect(result.status).toBe("success");
    expect(mocks.request.mock.calls[0][1]).toEqual({ userId: "u1", email: "sam@example.com" });
    expect(mocks.audit.mock.calls[0][1]).toMatchObject({ actorId: "u1", action: "account.deletion.requested" });
  });

  it("cancel only the caller's request", async () => {
    expect((await cancelDeletionAction()).status).toBe("success");
    expect(mocks.cancel.mock.calls[0][1]).toBe("u1");
  });
});
