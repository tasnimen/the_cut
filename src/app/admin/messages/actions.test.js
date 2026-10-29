import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), rate: vi.fn(), setStatus: vi.fn(), remove: vi.fn() }));
class AuthorizationError extends Error {}

vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: {} }) }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));
vi.mock("@/lib/contact/admin-messages", async (original) => ({ ...(await original()), setMessageStatus: mocks.setStatus, deleteMessage: mocks.remove }));

const { deleteMessageAction, setMessageStatusAction } = await import("./actions");
const ID = "a".repeat(24);

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.setStatus.mockResolvedValue({ ok: true });
  mocks.remove.mockResolvedValue({ ok: true });
});

describe("message actions", () => {
  it("change status with contactManageAll and the signed-in actor", async () => {
    expect((await setMessageStatusAction(ID, "read")).status).toBe("success");
    expect(mocks.requirePrincipal).toHaveBeenCalledWith("contactManageAll");
    expect(mocks.setStatus).toHaveBeenCalledWith({}, ID, "read", "admin-1");
  });

  it("delete only when the caller holds contactDeleteAll", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError());
    expect((await deleteMessageAction(ID)).code).toBe("denied");
    expect(mocks.remove).not.toHaveBeenCalled();
    mocks.requirePrincipal.mockResolvedValue({ id: "admin-1" });
    expect((await deleteMessageAction(ID)).status).toBe("success");
    expect(mocks.requirePrincipal).toHaveBeenLastCalledWith("contactDeleteAll");
    expect(mocks.remove).toHaveBeenCalledWith({}, ID, "admin-1");
  });

  it("reject unknown statuses and stop when rate limited", async () => {
    expect((await setMessageStatusAction(ID, "archived")).code).toBe("invalid");
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await setMessageStatusAction(ID, "read")).code).toBe("rate");
    expect((await deleteMessageAction(ID)).code).toBe("rate");
    expect(mocks.setStatus).not.toHaveBeenCalled();
  });

  it("report a missing message in friendly words", async () => {
    mocks.setStatus.mockResolvedValue({ ok: false, error: "not_found" });
    expect((await setMessageStatusAction(ID, "read")).message).toMatch(/not found/);
  });
});
