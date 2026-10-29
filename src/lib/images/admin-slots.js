import { appendAuditEvent } from "@/lib/security/audit-log";
import { isKnownSlot } from "@/lib/images/slot-input";

// Admin-side writes for the `imageSlot` collection (one document per slot). Callers authorize first
// (mediaSlotsManageAll) and then call revalidateCatalog(["slots"]). `media` is the record returned by the
// media service (public fields only); the slot keeps a copy of its address, size and alt text.

export const IMAGE_SLOT_COLLECTION = "imageSlot";

export async function setSlotOverride(db, slot, media, actorId, now = new Date()) {
  if (!isKnownSlot(slot)) return { ok: false, error: "unknown_slot" };
  await db.collection(IMAGE_SLOT_COLLECTION).updateOne(
    { slot },
    { $set: { slot, mediaId: String(media.id), secureUrl: media.secureUrl, alt: media.alt ?? "", width: media.width, height: media.height, updatedBy: actorId, updatedAt: now } },
    { upsert: true },
  );
  await appendAuditEvent(db, { actorId, action: "images.slot_set", targetType: "ImageSlot", targetId: slot, outcome: "success" });
  return { ok: true };
}

// Removing the override brings back the local file (or the built-in fallback) for that slot.
export async function clearSlotOverride(db, slot, actorId) {
  if (!isKnownSlot(slot)) return { ok: false, error: "unknown_slot" };
  const result = await db.collection(IMAGE_SLOT_COLLECTION).deleteOne({ slot });
  if (result.deletedCount !== 1) return { ok: false, error: "not_found" };
  await appendAuditEvent(db, { actorId, action: "images.slot_cleared", targetType: "ImageSlot", targetId: slot, outcome: "success" });
  return { ok: true };
}
