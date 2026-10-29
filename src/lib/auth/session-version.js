import { userIdFilter } from "@/lib/db/user-filter";
export function isSessionVersionCurrent(sessionVersion, currentUserVersion) {
  return Number.isInteger(sessionVersion)
    && Number.isInteger(currentUserVersion)
    && sessionVersion === currentUserVersion;
}

export async function bumpSessionVersionForSecurityUpdate(db, update, context) {
  const securityFields = ["role", "status", "twoFactorEnabled"];
  const changedFields = securityFields.filter((field) => Object.hasOwn(update, field));
  if (changedFields.length === 0) return;

  const userId = update.id || context?.context?.session?.user?.id;
  if (typeof userId !== "string") return false;

  const currentUser = await db.collection("user").findOne(
    userIdFilter(userId),
    { projection: Object.fromEntries(changedFields.map((field) => [field, 1])) },
  );
  if (!currentUser) return false;
  if (changedFields.every((field) => currentUser[field] === update[field])) return;

  const result = await db.collection("user").updateOne(
    userIdFilter(userId),
    { $inc: { sessionVersion: 1 } },
  );
  if (result.matchedCount !== 1) return false;
}

export async function bumpSessionVersionAfterPasswordChange(db, userId) {
  if (typeof userId !== "string" || userId.length === 0) return false;
  const result = await db.collection("user").updateOne(
    userIdFilter(userId),
    { $inc: { sessionVersion: 1 } },
  );
  return result.matchedCount === 1;
}
