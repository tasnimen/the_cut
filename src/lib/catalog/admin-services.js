import { ARCHIVED, NOT_ARCHIVED, missReason, toArchiveInfo } from "@/lib/catalog/archive";
import { BOOKING_SERVICES } from "@/config/booking-services";
import { normalizeImage } from "@/lib/catalog/image-input";
import { SERVICE_CATEGORIES, SERVICE_ICONS } from "@/lib/catalog/normalize";
import { describeChanges } from "@/lib/catalog/service-input";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Admin-side reads and writes for the `service` collection. Callers authorize first
// (requirePrincipal("servicesManageAll")); this module validates nothing about identity.
// There is deliberately no hard delete: services referenced by past bookings and barber
// assignments are deactivated or archived (lib/catalog/archive.js) instead, which keeps history intact.
// An archived service is read-only here until it is restored.

const ADMIN_PROJECTION = { _id: 0, slug: 1, name: 1, description: 1, durationMinutes: 1, priceMinorUnits: 1, active: 1, displayOrder: 1, category: 1, icon: 1, image: 1, updatedAt: 1, archivedAt: 1 };
const fileBySlug = new Map(BOOKING_SERVICES.map((service, index) => [service.slug, { ...service, order: index + 1 }]));

function toAdminDto(doc) {
  const base = fileBySlug.get(doc.slug);
  return {
    slug: doc.slug,
    name: doc.name ?? base?.name ?? doc.slug,
    description: doc.description ?? base?.detail ?? "",
    durationMinutes: Number.isInteger(doc.durationMinutes) ? doc.durationMinutes : 30,
    priceMinorUnits: Number.isInteger(doc.priceMinorUnits) ? doc.priceMinorUnits : null,
    active: doc.active !== false,
    displayOrder: Number.isFinite(doc.displayOrder) ? doc.displayOrder : base?.order ?? 999,
    category: SERVICE_CATEGORIES.includes(doc.category) ? doc.category : base?.category ?? "haircut",
    icon: SERVICE_ICONS.includes(doc.icon) ? doc.icon : base?.icon ?? "scissors",
    image: normalizeImage(doc.image),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
    ...toArchiveInfo(doc),
  };
}

// Active list by default (never archived records); { archived: true } returns only the archived ones.
export async function listAdminServices(db, { archived = false } = {}) {
  const docs = await db.collection("service").find(archived ? ARCHIVED : NOT_ARCHIVED, { projection: ADMIN_PROJECTION }).limit(200).toArray();
  return docs.map(toAdminDto).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export async function getAdminService(db, slug) {
  const doc = await db.collection("service").findOne({ slug }, { projection: ADMIN_PROJECTION });
  return doc ? toAdminDto(doc) : null;
}

export async function createAdminService(db, data, actorId) {
  const now = new Date();
  try {
    await db.collection("service").insertOne({ ...data, currency: "USD", createdAt: now, updatedAt: now });
  } catch (error) {
    if (error?.code === 11000) return { ok: false, error: "slug_taken" };
    throw error;
  }
  await appendAuditEvent(db, { actorId, action: "catalog.service.created", targetType: "Service", targetId: data.slug, outcome: "success", details: { price: String(data.priceMinorUnits), active: String(data.active) } });
  return { ok: true };
}

// `fields` must already be validated by serviceFieldsSchema (never contains slug or currency).
export async function updateAdminService(db, slug, fields, actorId) {
  const before = await getAdminService(db, slug);
  if (!before) return { ok: false, error: "not_found" };
  if (before.archived) return { ok: false, error: "archived" };
  const changes = describeChanges(before, fields);
  const result = await db.collection("service").updateOne({ slug, ...NOT_ARCHIVED }, { $set: { ...fields, updatedAt: new Date() } });
  if (result.matchedCount !== 1) return { ok: false, error: await missReason(db, "services", slug) };
  await appendAuditEvent(db, { actorId, action: "catalog.service.updated", targetType: "Service", targetId: slug, outcome: "success", details: changes });
  return { ok: true, changed: Object.keys(changes).length };
}

export async function setAdminServiceActive(db, slug, active, actorId) {
  const result = await db.collection("service").updateOne({ slug, ...NOT_ARCHIVED }, { $set: { active: Boolean(active), updatedAt: new Date() } });
  if (result.matchedCount !== 1) return { ok: false, error: await missReason(db, "services", slug) };
  await appendAuditEvent(db, { actorId, action: active ? "catalog.service.activated" : "catalog.service.deactivated", targetType: "Service", targetId: slug, outcome: "success" });
  return { ok: true };
}
