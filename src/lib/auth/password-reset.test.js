import { describe, expect, it } from "vitest";
import { betterAuth } from "better-auth";
import { createAuthMailer } from "../mail/mailer-core.js";

const BASE_URL = "http://localhost:3000";
const SECRET = "password-reset-test-secret-with-at-least-32-characters";
const headers = { origin: BASE_URL, "content-type": "application/json" };

function createFixture() {
  const sent = [];
  const mailer = createAuthMailer({
    transport: { sendMail: async (message) => sent.push(message) },
    from: "noreply@example.test",
    alertTo: "security@example.test",
    allowedOrigin: BASE_URL,
  });
  const resets = [];
  const auth = betterAuth({
    appName: "The Cut reset test",
    baseURL: BASE_URL,
    secret: SECRET,
    trustedOrigins: [BASE_URL],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => { await mailer.sendPasswordResetEmail({ to: user.email, name: user.name, url }); },
      onPasswordReset: async ({ user }) => { resets.push(user.email); },
    },
    rateLimit: { enabled: false },
    advanced: { defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: false, path: "/" } },
  });
  const post = (path, body) => auth.handler(new Request(`${BASE_URL}/api/auth${path}`, { method: "POST", headers, body: JSON.stringify(body) }));
  return { auth, post, sent, resets };
}

describe("password reset (mock transport)", () => {
  it("emails a one-time link, resets the password, and rejects the old password and a replayed token", async () => {
    const { post, sent, resets, auth } = createFixture();
    expect((await post("/sign-up/email", { name: "Reset Test", email: "reset@example.test", password: "old-password-long" })).status).toBe(200);

    const request = await post("/request-password-reset", { email: "reset@example.test", redirectTo: "/reset-password" });
    expect(request.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("reset@example.test");
    expect(sent[0].subject).toMatch(/reset your password/i);
    const link = sent[0].text.match(/https?:\/\/\S+/)[0];
    const token = new URL(link).pathname.split("/").pop();
    expect(token.length).toBeGreaterThan(8);

    const reset = await post("/reset-password", { newPassword: "new-password-long-1", token });
    expect(reset.status).toBe(200);
    expect(resets).toEqual(["reset@example.test"]);

    expect((await post("/sign-in/email", { email: "reset@example.test", password: "old-password-long" })).status).toBe(401);
    expect((await post("/sign-in/email", { email: "reset@example.test", password: "new-password-long-1" })).status).toBe(200);
    expect((await post("/reset-password", { newPassword: "another-password-2", token })).status).not.toBe(200);
    expect(auth).toBeTruthy();
  });

  it("answers identically for an unknown address and sends nothing", async () => {
    const { post, sent } = createFixture();
    await post("/sign-up/email", { name: "Known", email: "known@example.test", password: "old-password-long" });
    const known = await post("/request-password-reset", { email: "known@example.test", redirectTo: "/reset-password" });
    const unknown = await post("/request-password-reset", { email: "nobody@example.test", redirectTo: "/reset-password" });
    expect(unknown.status).toBe(known.status);
    expect(await unknown.json()).toEqual(await known.json());
    expect(sent).toHaveLength(1);
  });

  it("rejects a reset link pointing at an unexpected origin", async () => {
    const mailer = createAuthMailer({ transport: { sendMail: async () => {} }, from: "noreply@example.test", alertTo: "security@example.test", allowedOrigin: BASE_URL });
    await expect(mailer.sendPasswordResetEmail({ to: "a@example.test", name: "A", url: "https://evil.example/reset" })).rejects.toThrow(/unexpected/);
  });
});
