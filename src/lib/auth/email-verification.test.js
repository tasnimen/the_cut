import { describe, expect, it } from "vitest";
import { betterAuth } from "better-auth";
import { createAuthMailer } from "../mail/mailer-core.js";
import { scheduleMailDelivery } from "../mail/mailer-core.js";
import {
  consumeEmailVerificationToken,
  dispatchOneTimeEmailVerification,
  registerEmailVerificationToken,
} from "./email-verification-tokens.js";

const BASE_URL = "http://localhost:3000";
const TEST_SECRET = "email-verification-test-secret-with-at-least-32-characters";

function createTokenDb() {
  const records = new Map();
  const collection = {
    async insertOne(record) {
      if (records.has(record.tokenHash)) {
        const duplicate = new Error("duplicate key");
        duplicate.code = 11000;
        throw duplicate;
      }
      records.set(record.tokenHash, { ...record });
      return { acknowledged: true };
    },
    async updateOne(filter, update) {
      const record = records.get(filter.tokenHash);
      if (!record || record.status !== filter.status || record.expiresAt <= filter.expiresAt.$gt) {
        return { modifiedCount: 0 };
      }
      Object.assign(record, update.$set);
      return { modifiedCount: 1 };
    },
  };
  return { records, collection: () => collection };
}

async function createVerificationFixture(expiresIn) {
  const db = createTokenDb();
  const sentMessages = [];
  const scheduled = [];
  let verificationUrl;
  const mailer = createAuthMailer({
    transport: { sendMail: async (message) => sentMessages.push(message) },
    from: "noreply@example.test",
    alertTo: "security@example.test",
    allowedOrigin: BASE_URL,
  });
  const auth = betterAuth({
    appName: "The Cut email test",
    baseURL: BASE_URL,
    secret: TEST_SECRET,
    trustedOrigins: [BASE_URL],
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      expiresIn,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url, token }) => {
        verificationUrl = url;
        scheduleMailDelivery({
          schedule: (task) => scheduled.push(task),
          send: async () => {
            await registerEmailVerificationToken(db, token, TEST_SECRET);
            await mailer.sendVerificationEmail({ to: user.email, name: user.name, url });
          },
          onFailure: async () => {},
        });
      },
    },
    rateLimit: { enabled: false },
    advanced: {
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: false, path: "/" },
    },
  });
  const signup = await auth.handler(new Request(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { origin: BASE_URL, "content-type": "application/json" },
    body: JSON.stringify({
      name: "Verification Test",
      email: "verification-test@example.invalid",
      password: "long-enough-mock-password",
      callbackURL: "/sign-in",
    }),
  }));

  return { auth, db, sentMessages, scheduled, signup, verificationUrl };
}

describe("email verification lifecycle", () => {
  it("verifies once and rejects a replay using a mock mail transport", async () => {
    const { auth, db, sentMessages, scheduled, signup, verificationUrl } = await createVerificationFixture(3600);
    expect(signup.status).toBe(200);
    expect(scheduled).toHaveLength(1);
    expect(sentMessages).toHaveLength(0);
    await scheduled[0]();
    expect(sentMessages).toHaveLength(1);

    const token = new URL(verificationUrl).searchParams.get("token");
    await expect(registerEmailVerificationToken(db, token, TEST_SECRET)).resolves.toBeUndefined();
    let handlerCalls = 0;
    const verify = () => dispatchOneTimeEmailVerification({
      token,
      consume: (candidate) => consumeEmailVerificationToken(db, candidate, TEST_SECRET),
      dispatch: () => {
        handlerCalls += 1;
        return auth.handler(new Request(verificationUrl));
      },
    });

    const firstUse = await verify();
    expect(firstUse.status).toBe(302);
    expect(handlerCalls).toBe(1);
    const replay = await verify();
    expect(replay.status).toBe(400);
    expect(handlerCalls).toBe(1);
  });

  it("rejects a verification link after its signed expiry", async () => {
    const { auth, db, sentMessages, scheduled, signup, verificationUrl } = await createVerificationFixture(1);
    expect(signup.status).toBe(200);
    await scheduled[0]();
    expect(sentMessages).toHaveLength(1);
    const token = new URL(verificationUrl).searchParams.get("token");

    await new Promise((resolve) => setTimeout(resolve, 1100));
    let handlerCalled = false;
    const response = await dispatchOneTimeEmailVerification({
      token,
      consume: (candidate) => consumeEmailVerificationToken(db, candidate, TEST_SECRET),
      dispatch: async () => {
        handlerCalled = true;
        return auth.handler(new Request(verificationUrl));
      },
    });

    expect(response.status).toBe(400);
    expect(handlerCalled).toBe(false);
  });

  it("resends verification mail when an unverified user signs in", async () => {
    const { auth, scheduled, signup, sentMessages } = await createVerificationFixture(3600);
    expect(signup.status).toBe(200);
    await scheduled[0]();
    const signIn = await auth.handler(new Request(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { origin: BASE_URL, "content-type": "application/json" },
      body: JSON.stringify({ email: "verification-test@example.invalid", password: "long-enough-mock-password" }),
    }));
    expect(signIn.status).toBe(403);
    expect(scheduled).toHaveLength(2);
    await scheduled[1]();
    expect(sentMessages).toHaveLength(2);
  });

  it("sets the verification token lifetime to one hour", async () => {
    const { scheduled, signup, verificationUrl } = await createVerificationFixture(3600);
    expect(signup.status).toBe(200);
    const token = new URL(verificationUrl).searchParams.get("token");
    const [, payload] = token.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    expect(claims.exp - claims.iat).toBe(3600);
    expect(scheduled).toHaveLength(1);
  });
});
