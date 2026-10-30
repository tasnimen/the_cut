import { ACTIVE_BOOKING_STATUSES, BOOKING_COLLECTION } from "@/lib/booking/booking-model";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Archive and restore for services, pricing packages and barbers (unit D2a). One shared implementation, so the
// three catalogs behave the same. Callers authorize first (requirePrincipal with the archive or restore switch).
//
// Archiving sets `archivedAt` and `archivedBy` and switches the record off (`active: false`), so the public site and
// the booking engine, which already hide inactive records, stop using it. Nothing is deleted: the slug stays reserved
// (the unique index still covers it), pictures stay attached, and old bookings keep their own snapshots.
// Restoring clears the two fields and leaves the record HIDDEN; an admin turns it on again deliberately.
// There is no hard delete here (permanent delete is Super Admin only and belongs to a later unit, D2b).

export const ARCHIVE_KINDS = Object.freeze({
  services: Object.freeze({ collection: "service", targetType: "Service", audit: "service", label: "service" }),
  packages: Object.freeze({ collection: "pricingPackage", targetType: "Package", audit: "package", label: "package" }),
  barbers: Object.freeze({ collection: "barber", targetType: "Barber", audit: "barber", label: "barber" }),
});

// Mongo filters: a record that was never archived has no `archivedAt` field at all.
export const NOT_ARCHIVED = Object.freeze({ archivedAt: { $exists: false } });
export const ARCHIVED = Object.freeze({ archivedAt: { $exists: true } });

// Fields every admin DTO carries.
export function toArchiveInfo(doc) {
  const archived = doc?.archivedAt instanceof Date;
  return { archived, archivedAt: archived ? doc.archivedAt.toISOString() : null };
}

// An archived record is never public: it counts as inactive whatever its stored flag says. The date itself is dropped
// (the public cache only holds plain data).
export const hideArchived = (docs) => docs.map(({ archivedAt, ...doc }) => (archivedAt ? { ...doc, active: false } : doc));

// Why a write that matched nothing missed: the record is archived (read-only) or it does not exist.
export async function missReason(db, kind, slug) {
  const config = ARCHIVE_KINDS[kind];
  const doc = await db.collection(config.collection).findOne({ slug }, { projection: { archivedAt: 1 } });
  return doc?.archivedAt ? "archived" : "not_found";
}

export async function archiveRecord(db, kind, slug, actorId, now = new Date()) {
  const config = ARCHIVE_KINDS[kind];
  if (!config) return { ok: false, error: "unknown_kind" };
  const records = db.collection(config.collection);
  const doc = await records.findOne({ slug }, { projection: { _id: 1, archivedAt: 1 } });
  if (!doc) return { ok: false, error: "not_found" };
  if (doc.archivedAt) return { ok: false, error: "already_archived" };

  if (kind === "barbers") {
    // A barber with upcoming pending or confirmed bookings stays in use until those are handled.
    const upcoming = await db.collection(BOOKING_COLLECTION).countDocuments({ barberId: String(doc._id), status: { $in: ACTIVE_BOOKING_STATUSES }, startsAt: { $gte: now } });
    if (upcoming > 0) return { ok: false, error: "upcoming_bookings", count: upcoming };
  }

  const set = { active: false, archivedAt: now, archivedBy: actorId, updatedAt: now };
  if (kind === "packages") set.featured = false;
  const result = await records.updateOne({ slug, ...NOT_ARCHIVED }, { $set: set });
  if (result.matchedCount !== 1) return { ok: false, error: "already_archived" };
  await appendAuditEvent(db, { actorId, action: `catalog.${config.audit}.archived`, targetType: config.targetType, targetId: slug, outcome: "success" });
  return { ok: true };
}

export async function restoreRecord(db, kind, slug, actorId, now = new Date()) {
  const config = ARCHIVE_KINDS[kind];
  if (!config) return { ok: false, error: "unknown_kind" };
  const records = db.collection(config.collection);
  const doc = await records.findOne({ slug }, { projection: { archivedAt: 1 } });
  if (!doc) return { ok: false, error: "not_found" };
  if (!doc.archivedAt) return { ok: false, error: "not_archived" };
  const result = await records.updateOne({ slug, ...ARCHIVED }, { $set: { active: false, updatedAt: now }, $unset: { archivedAt: "", archivedBy: "" } });
  if (result.matchedCount !== 1) return { ok: false, error: "not_archived" };
  await appendAuditEvent(db, { actorId, action: `catalog.${config.audit}.restored`, targetType: config.targetType, targetId: slug, outcome: "success" });
  return { ok: true };
}

// The message an admin sees for an archive or restore result (never contains data).
export function archiveMessage(kind, result, restoring) {
  const label = ARCHIVE_KINDS[kind]?.label ?? "record";
  if (result.ok) return restoring ? `Restored. The ${label} is hidden until you show it.` : `Archived. The ${label} is hidden everywhere and can be restored.`;
  switch (result.error) {
    case "upcoming_bookings": return `This ${label} has ${result.count} upcoming booking${result.count === 1 ? "" : "s"}. Move or cancel them first, then archive.`;
    case "already_archived": return `That ${label} is already archived.`;
    case "not_archived": return `That ${label} is not archived.`;
    default: return `That ${label} was not found.`;
  }
}
