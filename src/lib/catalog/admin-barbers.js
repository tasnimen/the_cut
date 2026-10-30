import { ARCHIVED, NOT_ARCHIVED, missReason, toArchiveInfo } from "@/lib/catalog/archive";
import { normalizeImage } from "@/lib/catalog/image-input";
import { describeBarberChanges, WEEKDAYS } from "@/lib/catalog/barber-input";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Admin-side reads and writes for the `barber` collection. Callers authorize first
// (requirePrincipal("barbersManageAll")). No hard delete: barbers with past or future bookings are
// switched off instead, which removes them from availability but keeps booking history intact.
// Changing hours does NOT move existing appointments; the screens say so.
// A barber can be archived (lib/catalog/archive.js) when no upcoming booking remains; an archived barber is read-only.

const PROJECTION = { _id: 0, slug: 1, name: 1, active: 1, serviceSlugs: 1, weeklySchedule: 1, breaks: 1, daysOff: 1, publicProfile: 1, role: 1, focus: 1, displayOrder: 1, image: 1, updatedAt: 1, archivedAt: 1 };
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanDay(value) {
  return value && typeof value === "object" && TIME.test(value.open) && TIME.test(value.close) ? { open: value.open, close: value.close } : null;
}

function cleanSchedule(map) {
  const result = {};
  for (const day of WEEKDAYS) {
    const entry = cleanDay(map?.[day]);
    if (entry) result[day] = entry;
  }
  return result;
}

export function toBarberDto(doc, index = 0) {
  return {
    slug: doc.slug,
    name: doc.name ?? doc.slug,
    active: doc.active !== false,
    serviceSlugs: Array.isArray(doc.serviceSlugs) ? doc.serviceSlugs.filter((slug) => typeof slug === "string") : [],
    weeklySchedule: cleanSchedule(doc.weeklySchedule),
    breaks: cleanSchedule(doc.breaks),
    daysOff: Array.isArray(doc.daysOff) ? doc.daysOff.filter((date) => typeof date === "string") : [],
    publicProfile: doc.publicProfile === true,
    role: typeof doc.role === "string" ? doc.role : "",
    focus: typeof doc.focus === "string" ? doc.focus : "",
    displayOrder: Number.isFinite(doc.displayOrder) ? doc.displayOrder : index + 1,
    image: normalizeImage(doc.image),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
    ...toArchiveInfo(doc),
  };
}

// Active list by default (never archived records); { archived: true } returns only the archived ones.
export async function listAdminBarbers(db, { archived = false } = {}) {
  const docs = await db.collection("barber").find(archived ? ARCHIVED : NOT_ARCHIVED, { projection: PROJECTION }).limit(100).toArray();
  return docs.map(toBarberDto).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export async function getAdminBarber(db, slug) {
  const doc = await db.collection("barber").findOne({ slug }, { projection: PROJECTION });
  return doc ? toBarberDto(doc) : null;
}

export async function createAdminBarber(db, data, actorId) {
  const now = new Date();
  try {
    await db.collection("barber").insertOne({ ...data, createdAt: now, updatedAt: now });
  } catch (error) {
    if (error?.code === 11000) return { ok: false, error: "slug_taken" };
    throw error;
  }
  await appendAuditEvent(db, { actorId, action: "catalog.barber.created", targetType: "Barber", targetId: data.slug, outcome: "success", details: { active: String(data.active), services: String(data.serviceSlugs.length) } });
  return { ok: true };
}

// `fields` must already be validated (never contains slug).
export async function updateAdminBarber(db, slug, fields, actorId) {
  const before = await getAdminBarber(db, slug);
  if (!before) return { ok: false, error: "not_found" };
  if (before.archived) return { ok: false, error: "archived" };
  const changes = describeBarberChanges(before, fields);
  const result = await db.collection("barber").updateOne({ slug, ...NOT_ARCHIVED }, { $set: { ...fields, updatedAt: new Date() } });
  if (result.matchedCount !== 1) return { ok: false, error: await missReason(db, "barbers", slug) };
  await appendAuditEvent(db, { actorId, action: "catalog.barber.updated", targetType: "Barber", targetId: slug, outcome: "success", details: changes });
  return { ok: true, changed: Object.keys(changes).length };
}

export async function setAdminBarberActive(db, slug, active, actorId) {
  const result = await db.collection("barber").updateOne({ slug, ...NOT_ARCHIVED }, { $set: { active: Boolean(active), updatedAt: new Date() } });
  if (result.matchedCount !== 1) return { ok: false, error: await missReason(db, "barbers", slug) };
  await appendAuditEvent(db, { actorId, action: active ? "catalog.barber.activated" : "catalog.barber.deactivated", targetType: "Barber", targetId: slug, outcome: "success" });
  return { ok: true };
}
