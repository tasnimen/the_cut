import { describe, expect, it } from "vitest";
import {
  AUTH_RATE_LIMIT_POLICY,
  isSafeFilterInput,
  isValidSignInPayload,
  normalizeSignInFailure,
  signInDelayRemaining,
  stripSessionTokenFromResponse,
} from "./request-security.js";

describe("auth request hardening", () => {
  it("rejects NoSQL operator objects as sign-in identities", () => {
    expect(isValidSignInPayload({ email: { $ne: null }, password: "random-password" })).toBe(false);
    expect(isValidSignInPayload({ email: "dummy@example.invalid", password: "random-password" })).toBe(true);
  });

  it("rejects NoSQL operators, dotted keys, objects, and unknown fields in filter inputs", () => {
    const fields = ["category", "status"];
    expect(isSafeFilterInput({ category: "hair" }, fields)).toBe(true);
    expect(isSafeFilterInput({ category: { $ne: null } }, fields)).toBe(false);
    expect(isSafeFilterInput({ "$where": "true" }, fields)).toBe(false);
    expect(isSafeFilterInput({ "user.role": "ADMIN" }, fields)).toBe(false);
    expect(isSafeFilterInput({ other: "value" }, fields)).toBe(false);
  });

  it("uses the shared Mongo-backed rate-limit policy with a strict sign-in cap", () => {
    expect(AUTH_RATE_LIMIT_POLICY).toMatchObject({ enabled: true, storage: "database", window: 60, max: 100 });
    expect(AUTH_RATE_LIMIT_POLICY.customRules["/sign-in/*"]).toEqual({ window: 60, max: 5 });
    expect(AUTH_RATE_LIMIT_POLICY.customRules["/sign-up/*"]).toEqual({ window: 3600, max: 5 });
  });

  it("normalizes failed sign-in messages and applies the same minimum response floor", async () => {
    const existingWrongPassword = new Response(JSON.stringify({ message: "Invalid email or password" }), { status: 401 });
    const unknownEmail = new Response(JSON.stringify({ message: "User not found" }), { status: 401 });
    const startedAt = Date.now() - 500;
    const [existingResponse, unknownResponse] = await Promise.all([
      normalizeSignInFailure(existingWrongPassword, startedAt),
      normalizeSignInFailure(unknownEmail, startedAt),
    ]);

    expect(existingResponse.status).toBe(401);
    expect(unknownResponse.status).toBe(401);
    await expect(existingResponse.json()).resolves.toEqual(await unknownResponse.json());
    expect(signInDelayRemaining(100, 200)).toBe(400);
    expect(signInDelayRemaining(100, 700)).toBe(0);
  });

  it("removes Better Auth's session token from JSON responses while preserving cookies", async () => {
    const response = new Response(JSON.stringify({ token: "opaque-session-token", user: { id: "dummy-user" } }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": "better-auth.session_token=opaque-session-token; HttpOnly; Path=/; SameSite=Lax",
      },
    });

    const safeResponse = await stripSessionTokenFromResponse(response);
    await expect(safeResponse.json()).resolves.toEqual({ user: { id: "dummy-user" } });
    expect(safeResponse.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("leaves non-auth and non-JSON responses untouched", async () => {
    const html = new Response("ok", { headers: { "content-type": "text/html" } });
    await expect(stripSessionTokenFromResponse(html)).resolves.toBe(html);
  });
});
