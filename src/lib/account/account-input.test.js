import { describe, expect, it } from "vitest";
import { describeDevice, fieldErrors, PasswordChangeSchema, ProfileSchema, SessionIdSchema, shapeSessions, tokenForOwnSession } from "@/lib/account/account-input";

describe("ProfileSchema", () => {
  it("trims and accepts a normal name", () => {
    expect(ProfileSchema.parse({ name: "  Sam Carter " }).name).toBe("Sam Carter");
  });
  it("rejects short names, markup, control characters and unknown keys", () => {
    expect(ProfileSchema.safeParse({ name: "S" }).success).toBe(false);
    expect(ProfileSchema.safeParse({ name: "<b>Sam</b>" }).success).toBe(false);
    expect(ProfileSchema.safeParse({ name: "Sam\u0000" }).success).toBe(false);
    expect(ProfileSchema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
    expect(ProfileSchema.safeParse({ name: "Sam Carter", role: "ADMIN" }).success).toBe(false);
  });
});

describe("PasswordChangeSchema", () => {
  const ok = { currentPassword: "old-password-1", newPassword: "new-password-22", confirm: "new-password-22" };
  it("accepts a valid change", () => {
    expect(PasswordChangeSchema.safeParse(ok).success).toBe(true);
  });
  it("rejects short, mismatched and unchanged passwords", () => {
    expect(fieldErrors(PasswordChangeSchema.safeParse({ ...ok, newPassword: "short", confirm: "short" }).error).newPassword).toMatch(/at least 10/);
    expect(fieldErrors(PasswordChangeSchema.safeParse({ ...ok, confirm: "different-password" }).error).confirm).toMatch(/do not match/);
    expect(fieldErrors(PasswordChangeSchema.safeParse({ ...ok, newPassword: ok.currentPassword, confirm: ok.currentPassword }).error).newPassword).toMatch(/not used/);
  });
  it("rejects unknown keys", () => {
    expect(PasswordChangeSchema.safeParse({ ...ok, revokeOtherSessions: false }).success).toBe(false);
  });
});

describe("sessions", () => {
  it("labels devices briefly", () => {
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/120 Safari/537")).toBe("Chrome on Windows");
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari/604")).toBe("Safari on iOS");
    expect(describeDevice("")).toBe("Unknown device");
  });
  const rows = [
    { id: "a", token: "tok-a", userAgent: "Firefox/120 (Linux)", createdAt: "2026-10-01T10:00:00Z", expiresAt: "2026-10-08T10:00:00Z", sessionVersion: 1 },
    { id: "b", token: "tok-b", userAgent: "Chrome/120 Safari (Windows)", createdAt: "2026-10-02T10:00:00Z", expiresAt: "2026-10-09T10:00:00Z", sessionVersion: 1 },
    { id: "old", token: "tok-old", userAgent: "", createdAt: "2026-09-01T10:00:00Z", expiresAt: "2026-09-08T10:00:00Z", sessionVersion: 0 },
  ];
  it("hides stale sessions, marks the current one first and never exposes tokens", () => {
    const shaped = shapeSessions(rows, { currentSessionId: "a", userVersion: 1 });
    expect(shaped.map((s) => s.id)).toEqual(["a", "b"]);
    expect(shaped[0].current).toBe(true);
    expect(JSON.stringify(shaped)).not.toMatch(/tok-/);
  });
  it("only resolves tokens of the caller's own sessions", () => {
    expect(tokenForOwnSession(rows, "b")).toBe("tok-b");
    expect(tokenForOwnSession(rows, "someone-elses")).toBeUndefined();
  });
  it("validates session ids", () => {
    expect(SessionIdSchema.safeParse("abc12345DEF").success).toBe(true);
    expect(SessionIdSchema.safeParse({ $ne: "" }).success).toBe(false);
    expect(SessionIdSchema.safeParse("a b").success).toBe(false);
  });
});
