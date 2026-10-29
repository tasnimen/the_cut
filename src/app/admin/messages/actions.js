"use server";

import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { deleteMessage, MESSAGE_STATUSES, setMessageStatus } from "@/lib/contact/admin-messages";
import { getMongo } from "@/lib/db/mongo";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export is a public HTTP endpoint: each call re-checks session, role, TOTP and the permission.
// Changing status needs contactManageAll and deleting needs contactDeleteAll (both Admin and Super
// Admin today); each action checks its own permission so the two can be split again in one place.

const RATE = { bucket: "admin-messages", limit: 60, windowMs: 60_000 };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };

async function authorize(permission) {
  try {
    const principal = await requirePrincipal(permission);
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many changes in a short time. Wait a moment and try again." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

export async function setMessageStatusAction(id, status) {
  const auth = await authorize("contactManageAll");
  if (auth.error) return auth.error;
  if (!MESSAGE_STATUSES.includes(status)) return { status: "error", code: "invalid", message: "That status is not valid." };
  const { db } = await getMongo();
  const result = await setMessageStatus(db, id, status, auth.principal.id);
  if (!result.ok) return { status: "error", code: result.error, message: "That message was not found." };
  return { status: "success", code: "saved", message: "Saved." };
}

export async function deleteMessageAction(id) {
  const auth = await authorize("contactDeleteAll");
  if (auth.error) return auth.error;
  const { db } = await getMongo();
  const result = await deleteMessage(db, id, auth.principal.id);
  if (!result.ok) return { status: "error", code: result.error, message: "That message was not found." };
  return { status: "success", code: "deleted", message: "Message deleted." };
}
