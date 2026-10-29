"use server";

import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { fieldErrors, PasswordChangeSchema, ProfileSchema, SessionIdSchema, tokenForOwnSession } from "@/lib/account/account-input";
import { getMongo } from "@/lib/db/mongo";
import { appendAuditEvent } from "@/lib/security/audit-log";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export is a public HTTP endpoint: each call re-checks the session and the permission, acts
// only on the signed-in user (the id never comes from the client), validates input strictly and
// is rate limited per user. Passwords are never logged or stored by this code; Better Auth hashes them.

const DENIED = { status: "error", code: "denied", message: "Please sign in again to continue." };
const RATE_LIMITED = { status: "error", code: "rate", message: "Too many attempts. Wait a moment and try again." };

async function authorize(permission, bucket, limit) {
  try {
    const principal = await requirePrincipal(permission);
    const rate = await consumeUserRateLimit(principal.id, { bucket, limit, windowMs: 60_000 });
    if (!rate.allowed) return { error: RATE_LIMITED };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

async function audit(principal, action, outcome = "success") {
  const { db } = await getMongo();
  await appendAuditEvent(db, { actorId: principal.id, action, targetType: "User", targetId: principal.id, outcome });
}

export async function updateProfileAction(_previous, formData) {
  const auth = await authorize("profileOwn", "account-profile", 10);
  if (auth.error) return auth.error;

  const parsed = ProfileSchema.safeParse({ name: String(formData.get("name") ?? "") });
  if (!parsed.success) return { status: "error", code: "invalid", message: "Check the highlighted field.", fieldErrors: fieldErrors(parsed.error), values: { name: String(formData.get("name") ?? "") } };

  const authApi = await getAuth();
  await authApi.api.updateUser({ headers: await headers(), body: { name: parsed.data.name } });
  await audit(auth.principal, "account.profile.updated");
  return { status: "success", code: "saved", message: "Your name was updated.", values: parsed.data };
}

export async function changePasswordAction(_previous, formData) {
  const auth = await authorize("profileOwn", "account-password", 5);
  if (auth.error) return auth.error;

  const parsed = PasswordChangeSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  try {
    const authApi = await getAuth();
    await authApi.api.changePassword({
      headers: await headers(),
      body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword, revokeOtherSessions: true },
    });
  } catch (error) {
    if (error?.name === "APIError" || error?.status) {
      await audit(auth.principal, "account.password.change_failed", "failure");
      return { status: "error", code: "wrong_password", message: "That password was not accepted.", fieldErrors: { currentPassword: "Your current password is not correct." } };
    }
    throw error;
  }
  await audit(auth.principal, "account.password.changed");
  // The password change invalidates every session, including this one, so the page signs out and returns to sign-in.
  return { status: "success", code: "password_changed", message: "Your password was updated. Sign in again." };
}

export async function revokeSessionAction(sessionId) {
  const auth = await authorize("sessionsOwn", "account-sessions", 20);
  if (auth.error) return auth.error;
  if (!SessionIdSchema.safeParse(sessionId).success) return { status: "error", code: "not_found", message: "That session was not found." };
  if (sessionId === auth.principal.sessionId) return { status: "error", code: "current", message: "Use Sign out to end this session." };

  const authApi = await getAuth();
  const requestHeaders = await headers();
  const rows = await authApi.api.listSessions({ headers: requestHeaders });
  const token = tokenForOwnSession(rows, sessionId);
  if (!token) return { status: "error", code: "not_found", message: "That session was not found." };
  await authApi.api.revokeSession({ headers: requestHeaders, body: { token } });
  await audit(auth.principal, "account.session.revoked");
  return { status: "success", code: "revoked", message: "That device was signed out." };
}

export async function revokeOtherSessionsAction() {
  const auth = await authorize("sessionsOwn", "account-sessions", 20);
  if (auth.error) return auth.error;
  const authApi = await getAuth();
  await authApi.api.revokeOtherSessions({ headers: await headers() });
  await audit(auth.principal, "account.sessions.revoked_others");
  return { status: "success", code: "revoked", message: "All other devices were signed out." };
}
