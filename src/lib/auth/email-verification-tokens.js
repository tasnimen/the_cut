import { createHmac } from "node:crypto";

function verificationTokenHash(token, secret) {
  if (typeof token !== "string" || token.length > 4096 || typeof secret !== "string") return null;
  return createHmac("sha256", secret).update(token).digest("base64url");
}

function readTokenExpiry(token) {
  try {
    const [, payload] = token.split(".");
    const exp = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).exp;
    return Number.isInteger(exp) ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
}

export async function registerEmailVerificationToken(db, token, secret, now = new Date()) {
  const tokenHash = verificationTokenHash(token, secret);
  const expiresAt = readTokenExpiry(token);
  if (!tokenHash || !expiresAt || expiresAt <= now) throw new Error("Invalid email verification token");

  try {
    await db.collection("emailVerificationToken").insertOne({
      tokenHash,
      status: "issued",
      createdAt: now,
      expiresAt,
    });
  } catch (error) {
    // Better Auth can issue an identical JWT more than once within the same second.
    if (error?.code !== 11000) throw error;
  }
}

export async function consumeEmailVerificationToken(db, token, secret, now = new Date()) {
  const tokenHash = verificationTokenHash(token, secret);
  if (!tokenHash) return false;
  const result = await db.collection("emailVerificationToken").updateOne({
    tokenHash,
    status: "issued",
    expiresAt: { $gt: now },
  }, {
    $set: { status: "consumed", consumedAt: now },
  });
  return result.modifiedCount === 1;
}

export async function dispatchOneTimeEmailVerification({ token, consume, dispatch }) {
  if (!await consume(token)) {
    return Response.json({ message: "This verification link is invalid, expired, or already used." }, { status: 400 });
  }
  return dispatch();
}
