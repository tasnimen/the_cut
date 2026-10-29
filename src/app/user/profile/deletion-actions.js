"use server";

import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { cancelDeletionRequest, confirmationMatches, requestDeletion } from "@/lib/account/deletion-request";
import { getMongo } from "@/lib/db/mongo";
import { appendAuditEvent } from "@/lib/security/audit-log";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Customers do not delete their own account; they ask the shop to. The email address comes from the
// session (never the client) and the typed confirmation must match it.

const DENIED = { status: "error", code: "denied", message: "Please sign in again to continue." };

async function authorize() {
  try {
    const principal = await requirePrincipal("profileOwn");
    const rate = await consumeUserRateLimit(principal.id, { bucket: "account-deletion", limit: 5, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many attempts. Try again later." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

export async function requestDeletionAction(_previous, formData) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!confirmationMatches(String(formData.get("confirm") ?? ""), email)) {
    return { status: "error", code: "invalid", message: "Type your email address exactly to confirm.", fieldErrors: { confirm: "That does not match your email address." } };
  }

  const { db } = await getMongo();
  await requestDeletion(db, { userId: auth.principal.id, email });
  await appendAuditEvent(db, { actorId: auth.principal.id, action: "account.deletion.requested", targetType: "User", targetId: auth.principal.id, outcome: "success" });
  return { status: "success", code: "requested", message: "Your request was sent. The shop will contact you before anything is deleted." };
}

export async function cancelDeletionAction() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { db } = await getMongo();
  const result = await cancelDeletionRequest(db, auth.principal.id);
  if (result.cancelled) await appendAuditEvent(db, { actorId: auth.principal.id, action: "account.deletion.cancelled", targetType: "User", targetId: auth.principal.id, outcome: "success" });
  return { status: "success", code: "cancelled", message: "Your deletion request was cancelled." };
}
