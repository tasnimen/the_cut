"use server";

import { AuthorizationError, requirePrincipal, requireRecentStepUp } from "@/lib/auth/authorization";
import { loadAdminGrants, saveAdminGrants } from "@/lib/auth/capabilities";
import { getMongo } from "@/lib/db/mongo";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Saves the Admin switches. Every export is a public HTTP endpoint, so each call re-checks, in this order:
// the session, TOTP and the Super Admin only permission (securitySettingsManage), a rate limit, a recent
// authenticator code (step-up, valid for 10 minutes), and then validates the input strictly (known
// capability ids with true or false, nothing else). An Admin, a customer or a guest never gets past the first step.

const RATE = { bucket: "super-admin-permissions", limit: 20, windowMs: 60_000 };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };

export async function saveAdminPermissionsAction(input) {
  let principal;
  try {
    principal = await requirePrincipal("securitySettingsManage");
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { status: "error", code: "rate", message: "Too many changes in a short time. Wait a moment and try again." };
  } catch (error) {
    if (error instanceof AuthorizationError) return DENIED;
    throw error;
  }

  try {
    await requireRecentStepUp(principal);
  } catch (error) {
    if (error instanceof AuthorizationError) return { status: "error", code: "step_up_required", message: "Enter your authenticator code to confirm this change." };
    throw error;
  }

  const { db } = await getMongo();
  const result = await saveAdminGrants(db, input, principal.id);
  if (!result.ok) return { status: "error", code: "invalid", message: "Those settings were not valid, so nothing was saved." };
  return { status: "success", code: "saved", message: result.changed.length === 0 ? "No changes to save." : "Saved. Admins see the change on their next click.", changed: result.changed.length, grants: await loadAdminGrants(db) };
}
