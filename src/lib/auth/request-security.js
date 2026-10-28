import { z } from "zod";

export const AUTH_RATE_LIMIT_POLICY = Object.freeze({
  enabled: true,
  storage: "database",
  window: 60,
  max: 100,
  customRules: Object.freeze({
    "/sign-in/*": Object.freeze({ window: 60, max: 5 }),
    "/sign-up/*": Object.freeze({ window: 3600, max: 5 }),
    "/request-password-reset": Object.freeze({ window: 3600, max: 3 }),
    "/reset-password*": Object.freeze({ window: 3600, max: 5 }),
    "/send-verification-email": Object.freeze({ window: 3600, max: 3 }),
    "/verify-email*": Object.freeze({ window: 3600, max: 10 }),
  }),
});

export const SIGN_IN_FAILURE_MIN_MS = 500;

export function signInDelayRemaining(startedAt, now = Date.now()) {
  return Math.max(0, SIGN_IN_FAILURE_MIN_MS - (now - startedAt));
}

const signInSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
  callbackURL: z.string().max(2048).optional(),
  rememberMe: z.boolean().optional(),
}).strict();

export function isValidSignInPayload(payload) {
  return signInSchema.safeParse(payload).success;
}

export function isSafeFilterInput(value, allowedFields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, fieldValue]) =>
    allowedFields.includes(key)
    && !key.startsWith("$")
    && !key.includes(".")
    && (fieldValue === null || ["string", "number", "boolean"].includes(typeof fieldValue)),
  );
}

export async function normalizeSignInFailure(response, startedAt, now = Date.now()) {
  if (response.status !== 401) return response;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.set("content-type", "application/json; charset=utf-8");
  const normalized = new Response(JSON.stringify({ message: "Invalid email or password" }), {
    status: 401,
    headers,
  });
  const remaining = signInDelayRemaining(startedAt, now);
  if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
  return normalized;
}

export async function stripSessionTokenFromResponse(response) {
  if (!response.headers.get("content-type")?.includes("application/json")) return response;
  let payload;
  try {
    payload = await response.clone().json();
  } catch {
    return response;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Object.hasOwn(payload, "token")) return response;

  const { token, ...safePayload } = payload;
  void token;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(safePayload), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
