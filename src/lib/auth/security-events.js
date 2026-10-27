import { createHmac, timingSafeEqual } from "node:crypto";

export const STEP_UP_COOKIE_NAME = "cut.step_up";
export const STEP_UP_MAX_AGE_SECONDS = 10 * 60;

export function hashAuthIdentifier(email, secret) {
  if (typeof email !== "string" || email.length > 320 || typeof secret !== "string") return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return createHmac("sha256", secret).update(normalized).digest("base64url");
}

export function isFailedAuthResult(path, result) {
  if (path !== "/sign-in/email" && path !== "/two-factor/verify-totp") return false;
  if (result instanceof Response) return result.status >= 400;
  return Boolean(result && typeof result === "object" && Number(result.statusCode) >= 400);
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createStepUpToken({ userId, sessionId, expiresAt }, secret) {
  if (![userId, sessionId].every((value) => typeof value === "string" && value.length > 0)) return null;
  const payload = Buffer.from(JSON.stringify({ userId, sessionId, expiresAt })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function isStepUpTokenValid(token, principal, secret, now = Date.now()) {
  if (typeof token !== "string" || typeof secret !== "string" || !principal) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return false;
  const expected = sign(payload, secret);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.userId === principal.id
      && data.sessionId === principal.sessionId
      && Number.isInteger(data.expiresAt)
      && data.expiresAt > now;
  } catch {
    return false;
  }
}
