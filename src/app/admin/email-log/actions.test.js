import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), consume: vi.fn(), resend: vi.fn(), audit: vi.fn() }));
class AuthorizationError extends Error {}
vi.mock("@/lib/auth/authorization", () => ({ requirePrincipal: mocks.requirePrincipal, AuthorizationError }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.consume }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: { name: "db" } }) }));
vi.mock("@/lib/mail/booking-mail", () => ({ resendMail: mocks.resend }));
vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: mocks.audit }));

const { resendMailAction } = await import("./actions.js");
const ID = "6ae4a05597700686ec5d6e8f";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.resend.mockResolvedValue({ ok: true, status: "sent" });
});
afterEach(() => vi.restoreAllMocks());

describe("resend a failed email", () => {
  it("asks for the permission and the Super Admin switch on every call", async () => {
    await resendMailAction(ID);
    expect(mocks.requirePrincipal).toHaveBeenCalledWith("mailLogManageAll", { capability: "emailLog.resend" });
  });

  it("does nothing when the switch is off, the session is not allowed, or the rate limit is reached", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError());
    expect(await resendMailAction(ID)).toMatchObject({ status: "error", code: "denied" });
    mocks.requirePrincipal.mockResolvedValue({ id: "admin-1" });
    mocks.consume.mockResolvedValue({ allowed: false });
    expect(await resendMailAction(ID)).toMatchObject({ code: "rate" });
    expect(mocks.resend).not.toHaveBeenCalled();
  });

  it("refuses anything that is not a 24-character id before touching the database", async () => {
    for (const id of [undefined, null, 5, {}, "", "abc", "../x", "z".repeat(24), `${ID}0`]) expect(await resendMailAction(id), String(id)).toMatchObject({ status: "error", code: "not_found" });
    expect(mocks.resend).not.toHaveBeenCalled();
  });

  it("sends a failed email again and audits who asked", async () => {
    expect(await resendMailAction(ID)).toMatchObject({ status: "success", code: "sent" });
    expect(mocks.resend).toHaveBeenCalledWith({ db: { name: "db" }, id: ID });
    expect(mocks.audit.mock.calls[0][1]).toMatchObject({ actorId: "admin-1", action: "mail.resend_requested", targetType: "MailLog", targetId: ID, outcome: "success" });
  });

  it("explains each refusal without data: not failed, not found, no longer applicable, still failing", async () => {
    mocks.resend.mockResolvedValue({ ok: false, error: "not_failed" });
    expect(await resendMailAction(ID)).toMatchObject({ code: "not_failed" });
    mocks.resend.mockResolvedValue({ ok: false, error: "not_found" });
    expect(await resendMailAction(ID)).toMatchObject({ code: "not_found" });
    mocks.resend.mockResolvedValue({ ok: false, status: "skipped" });
    expect(await resendMailAction(ID)).toMatchObject({ code: "skipped" });
    mocks.resend.mockResolvedValue({ ok: false, status: "failed" });
    const failed = await resendMailAction(ID);
    expect(failed).toMatchObject({ status: "error", code: "failed" });
    expect(mocks.audit.mock.calls.at(-1)[1]).toMatchObject({ outcome: "failure" });
  });

  it("an unexpected error gives a safe message and one log line", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.resend.mockRejectedValue(new Error("db down for sam@example.com"));
    expect(await resendMailAction(ID)).toMatchObject({ status: "error", code: "unexpected" });
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain("sam@example.com");
  });
});
