import "server-only";
import { capabilityAllowed, resolveGrants, validateGrantsInput, ADMIN_CAPABILITIES } from "@/config/admin-capabilities";
import { getMongo } from "@/lib/db/mongo";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Super Admin controlled capabilities of Admin users (rules in config/admin-capabilities.js).
// One small document in \`adminPermission\`; it is read on every guarded call (no long cache), so a change
// applies on the Admin's next click without signing out. If it cannot be read, Admin access is denied.

export const GRANTS_COLLECTION = "adminPermission";
export const GRANTS_ID = "admin-grants";

async function readGrantsDocument(db) {
  return db.collection(GRANTS_COLLECTION).findOne({ _id: GRANTS_ID });
}

// The effective grants right now (defaults when nothing was ever saved). Throws if the database fails.
export async function loadAdminGrants(db) {
  const database = db ?? (await getMongo()).db;
  return resolveGrants((await readGrantsDocument(database))?.grants);
}

// May a user with this role use the capability (or any of several)? SUPER_ADMIN always. ADMIN only when granted.
// Everyone else never. Any failure to read the grants means no.
export async function roleHasCapability(role, capability, db) {
  if (role === "SUPER_ADMIN") return true;
  if (role !== "ADMIN") return false;
  try {
    return capabilityAllowed(await loadAdminGrants(db), capability);
  } catch {
    return false;
  }
}

// Saves a complete set of grants (Super Admin only: the caller authorizes). Audited with counts, not names.
export async function saveAdminGrants(db, input, actorId, now = new Date()) {
  const checked = validateGrantsInput(input);
  if (!checked.ok) return checked;
  const before = resolveGrants((await readGrantsDocument(db))?.grants);
  const changed = ADMIN_CAPABILITIES.filter((id) => before[id] !== checked.grants[id]);
  await db.collection(GRANTS_COLLECTION).updateOne(
    { _id: GRANTS_ID },
    { $set: { grants: checked.grants, updatedAt: now, updatedBy: actorId }, $inc: { version: 1 } },
    { upsert: true },
  );
  const granted = changed.filter((id) => checked.grants[id]).length;
  await appendAuditEvent(db, { actorId, action: "permissions.admin_grants_updated", targetType: "AdminPermission", targetId: GRANTS_ID, outcome: "success", details: { changed: String(changed.length), granted: String(granted), revoked: String(changed.length - granted) } });
  return { ok: true, changed };
}

// Everything the screens need to hide what an Admin may not do: { "<capability>": boolean } for the whole catalog.
// SUPER_ADMIN gets all true; ADMIN gets the effective grants; anyone else, or any failure, gets all false.
// This only shapes the interface. The server still refuses the action or page on its own.
export async function effectiveCapabilities(role, db) {
  const all = (value) => Object.fromEntries(ADMIN_CAPABILITIES.map((id) => [id, value]));
  if (role === "SUPER_ADMIN") return all(true);
  if (role !== "ADMIN") return all(false);
  try {
    const grants = await loadAdminGrants(db);
    return Object.fromEntries(ADMIN_CAPABILITIES.map((id) => [id, capabilityAllowed(grants, id)]));
  } catch {
    return all(false);
  }
}

// Who changed the switches last, and when (for the Super Admin screen). Null parts when never saved.
export async function loadAdminGrantsMeta(db) {
  const doc = await readGrantsDocument(db);
  return { version: Number.isInteger(doc?.version) ? doc.version : 0, updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null, updatedBy: typeof doc?.updatedBy === "string" ? doc.updatedBy : null };
}
