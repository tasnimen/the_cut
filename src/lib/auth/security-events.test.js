import { describe, expect, it } from "vitest";
import {
  createStepUpToken,
  hashAuthIdentifier,
  isFailedAuthResult,
  isStepUpTokenValid,
} from "./security-events.js";

describe("authentication security events", () => {
  it("recognizes failures only on authentication verification endpoints", () => {
    expect(isFailedAuthResult("/sign-in/email", { statusCode: 401 })).toBe(true);
    expect(isFailedAuthResult("/two-factor/verify-totp", new Response(null, { status: 400 }))).toBe(true);
    expect(isFailedAuthResult("/sign-in/email", { statusCode: 200 })).toBe(false);
    expect(isFailedAuthResult("/update-user", { statusCode: 400 })).toBe(false);
  });

  it("pseudonymizes attempted email addresses without retaining the address", () => {
    const first = hashAuthIdentifier(" Barber@Example.com ", "secret");
    expect(first).toBe(hashAuthIdentifier("barber@example.com", "secret"));
    expect(first).not.toContain("barber");
    expect(hashAuthIdentifier("barber@example.com", "another-secret")).not.toBe(first);
    expect(hashAuthIdentifier({ $ne: null }, "secret")).toBeNull();
  });

  it("binds a short-lived step-up proof to one user and session", () => {
    const secret = "test-secret-with-adequate-randomness";
    const principal = { id: "user-1", sessionId: "session-1" };
    const token = createStepUpToken({ userId: principal.id, sessionId: principal.sessionId, expiresAt: 20_000 }, secret);

    expect(isStepUpTokenValid(token, principal, secret, 10_000)).toBe(true);
    expect(isStepUpTokenValid(token, { ...principal, sessionId: "session-2" }, secret, 10_000)).toBe(false);
    expect(isStepUpTokenValid(token, principal, "different-secret", 10_000)).toBe(false);
    expect(isStepUpTokenValid(token, principal, secret, 20_000)).toBe(false);
  });
});
