// Account deletion requests. Customers cannot delete themselves: a request is recorded and the
// shop processes it (the admin screen for this comes with the customers unit). One request per user.

export const DELETION_COLLECTION = "accountDeletionRequest";

export function confirmationMatches(typed, email) {
  return String(typed ?? "").trim().toLowerCase() === String(email ?? "").trim().toLowerCase() && String(email ?? "").length > 0;
}

export async function getDeletionRequest(db, userId) {
  const doc = await db.collection(DELETION_COLLECTION).findOne({ userId, status: "pending" }, { projection: { _id: 0, requestedAt: 1 } });
  return doc ? { requestedAt: doc.requestedAt.toISOString() } : null;
}

export async function requestDeletion(db, { userId, email }, now = new Date()) {
  const result = await db.collection(DELETION_COLLECTION).updateOne(
    { userId },
    { $set: { status: "pending", requestedAt: now, email }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  return { created: result.upsertedCount === 1 || result.modifiedCount === 1 };
}

export async function cancelDeletionRequest(db, userId, now = new Date()) {
  const result = await db.collection(DELETION_COLLECTION).updateOne({ userId, status: "pending" }, { $set: { status: "cancelled", cancelledAt: now } });
  return { cancelled: result.modifiedCount === 1 };
}
