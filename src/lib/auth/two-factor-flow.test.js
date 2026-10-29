import { describe, expect, it } from "vitest";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { parseTotpSecret } from "./two-factor.js";

const BASE_URL = "http://localhost:3000";
// What an authenticator app does: decode the Base32 secret from the setup key, then derive the 6-digit code.
const authenticatorCode = (secret) => createOTP(base32.decode(secret));
const baseHeaders = { origin: BASE_URL, "content-type": "application/json" };

function createFixture() {
  const auth = betterAuth({
    appName: "The Cut 2FA test",
    baseURL: BASE_URL,
    secret: "two-factor-flow-test-secret-with-at-least-32-chars",
    trustedOrigins: [BASE_URL],
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    plugins: [twoFactor({ issuer: "The Cut Barbershop", twoFactorCookieMaxAge: 600, accountLockout: { enabled: true, maxFailedAttempts: 3, durationSeconds: 900 } })],
    rateLimit: { enabled: false },
    advanced: { defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: false, path: "/" } },
  });
  const cookieJar = new Map();
  const remember = (response) => {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";");
      const [name, ...rest] = pair.split("=");
      cookieJar.set(name.trim(), rest.join("="));
    }
  };
  const call = async (path, body, { method = "POST" } = {}) => {
    const cookie = [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
    const response = await auth.handler(new Request(`${BASE_URL}/api/auth${path}`, {
      method,
      headers: { ...baseHeaders, ...(cookie ? { cookie } : {}) },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    }));
    remember(response);
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: response.status, json };
  };
  return { auth, call, cookieJar };
}

describe("TOTP enrolment and sign-in challenge (Better Auth, in memory)", () => {
  it("enrols with the password, only turns 2FA on after a valid code, then challenges at sign-in", async () => {
    const { call, cookieJar, auth } = createFixture();
    const user = { name: "Totp Admin", email: "totp-admin@example.test", password: "a-long-test-password-1" };

    expect((await call("/sign-up/email", user)).status).toBe(200);
    const enable = await call("/two-factor/enable", { password: user.password });
    expect(enable.status).toBe(200);
    expect(enable.json.totpURI).toMatch(/^otpauth:\/\/totp\//);
    expect(enable.json.backupCodes.length).toBeGreaterThanOrEqual(5);

    const afterEnable = await auth.api.getSession({ headers: new Headers({ cookie: [...cookieJar].map(([n, v]) => `${n}=${v}`).join("; ") }) });
    expect(afterEnable.user.twoFactorEnabled).toBeFalsy();

    const secret = parseTotpSecret(enable.json.totpURI);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    const code = await authenticatorCode(secret).totp();
    expect((await call("/two-factor/verify-totp", { code })).status).toBe(200);

    await call("/sign-out", {});
    cookieJar.clear();
    const signIn = await call("/sign-in/email", { email: user.email, password: user.password });
    expect(signIn.status).toBe(200);
    expect(signIn.json.twoFactorRedirect).toBe(true);
    expect(signIn.json.user).toBeUndefined();

    expect((await call("/two-factor/verify-totp", { code: "000000" })).status).toBeGreaterThanOrEqual(400);
    const good = await call("/two-factor/verify-totp", { code: await authenticatorCode(secret).totp() });
    expect(good.status).toBe(200);
    expect(good.json.user.email).toBe(user.email);
  });

  it("accepts a backup code once and rejects reuse", async () => {
    const { call, cookieJar } = createFixture();
    const user = { name: "Backup Admin", email: "backup-admin@example.test", password: "a-long-test-password-2" };
    await call("/sign-up/email", user);
    const enable = await call("/two-factor/enable", { password: user.password });
    const secret = parseTotpSecret(enable.json.totpURI);
    await call("/two-factor/verify-totp", { code: await authenticatorCode(secret).totp() });
    await call("/sign-out", {});
    cookieJar.clear();

    const [first] = enable.json.backupCodes;
    await call("/sign-in/email", { email: user.email, password: user.password });
    expect((await call("/two-factor/verify-backup-code", { code: first })).status).toBe(200);

    await call("/sign-out", {});
    cookieJar.clear();
    await call("/sign-in/email", { email: user.email, password: user.password });
    expect((await call("/two-factor/verify-backup-code", { code: first })).status).toBeGreaterThanOrEqual(400);
  });

  it("refuses enrolment with a wrong password", async () => {
    const { call } = createFixture();
    await call("/sign-up/email", { name: "Wrong Pw", email: "wrong-pw@example.test", password: "a-long-test-password-3" });
    expect((await call("/two-factor/enable", { password: "not-the-password-123" })).status).toBeGreaterThanOrEqual(400);
  });
});
