import { describe, expect, it } from "vitest";
import { betterAuth } from "better-auth";

describe("Better Auth session lifecycle", () => {
  it("invalidates the server session on sign-out", async () => {
    const baseURL = "http://localhost:3000";
    const auth = betterAuth({
      appName: "The Cut test",
      baseURL,
      secret: "unit-test-secret-with-at-least-32-characters-long",
      trustedOrigins: [baseURL],
      emailAndPassword: { enabled: true, requireEmailVerification: false },
      rateLimit: { enabled: false },
      advanced: {
        defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: false, path: "/" },
      },
    });
    const originHeaders = { origin: baseURL, "content-type": "application/json" };

    const signUp = await auth.handler(new Request(`${baseURL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: originHeaders,
      body: JSON.stringify({ name: "Dummy Test", email: "logout-check@example.invalid", password: "test-password-long-enough" }),
    }));
    expect(signUp.status).toBe(200);
    const wrongPassword = await auth.handler(new Request(`${baseURL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: originHeaders,
      body: JSON.stringify({ email: "logout-check@example.invalid", password: "wrong-password" }),
    }));
    expect(wrongPassword.status).toBe(401);
    await expect(wrongPassword.json()).resolves.toMatchObject({ code: "INVALID_EMAIL_OR_PASSWORD" });

    const signIn = await auth.handler(new Request(`${baseURL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: originHeaders,
      body: JSON.stringify({ email: "logout-check@example.invalid", password: "test-password-long-enough" }),
    }));
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();

    const signOut = await auth.handler(new Request(`${baseURL}/api/auth/sign-out`, {
      method: "POST",
      headers: { ...originHeaders, cookie },
      body: "{}",
    }));
    expect(signOut.status).toBe(200);

    const staleSession = await auth.handler(new Request(`${baseURL}/api/auth/get-session`, {
      headers: { origin: baseURL, cookie },
    }));
    expect(staleSession.status).toBe(200);
    await expect(staleSession.json()).resolves.toBeNull();
  });
});
