import { describePackageChanges } from "@/lib/catalog/package-input";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Admin-side reads and writes for the `pricingPackage` collection. Callers authorize first
// (requirePrincipal("packagesManageAll")). No hard delete: packages are hidden instead.
// At most one package is "featured" (the Popular badge): featuring one clears the others.

const PROJECTION = { _id: 0, slug: 1, name: 1, note: 1, priceMinorUnits: 1, inclusions: 1, featured: 1, active: 1, displayOrder: 1, bookingServiceSlugs: 1, updatedAt: 1 };

function toAdminDto(doc) {
  return {
    slug: doc.slug,
    name: doc.name ?? doc.slug,
    note: doc.note ?? "",
    priceMinorUnits: Number.isInteger(doc.priceMinorUnits) ? doc.priceMinorUnits : null,
    inclusions: Array.isArray(doc.inclusions) ? doc.inclusions.filter((item) => typeof item === "string") : [],
    featured: doc.featured === true,
    active: doc.active !== false,
    displayOrder: Number.isFinite(doc.displayOrder) ? doc.displayOrder : 999,
    bookingServiceSlugs: Array.isArray(doc.bookingServiceSlugs) ? doc.bookingServiceSlugs.filter((item) => typeof item === "string") : [],
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  };
}

export async function listAdminPackages(db) {
  const docs = await db.collection("pricingPackage").find({}, { projection: PROJECTION }).limit(50).toArray();
  return docs.map(toAdminDto).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export async function getAdminPackage(db, slug) {
  const doc = await db.collection("pricingPackage").findOne({ slug }, { projection: PROJECTION });
  return doc ? toAdminDto(doc) : null;
}

async function clearOtherFeatured(db, slug) {
  await db.collection("pricingPackage").updateMany({ slug: { $ne: slug }, featured: true }, { $set: { featured: false, updatedAt: new Date() } });
}

export async function createAdminPackage(db, data, actorId) {
  const now = new Date();
  try {
    await db.collection("pricingPackage").insertOne({ ...data, currency: "USD", createdAt: now, updatedAt: now });
  } catch (error) {
    if (error?.code === 11000) return { ok: false, error: "slug_taken" };
    throw error;
  }
  if (data.featured) await clearOtherFeatured(db, data.slug);
  await appendAuditEvent(db, { actorId, action: "catalog.package.created", targetType: "Package", targetId: data.slug, outcome: "success", details: { price: String(data.priceMinorUnits), active: String(data.active) } });
  return { ok: true };
}

// `fields` must already be validated by packageFieldsSchema (never contains slug or currency).
export async function updateAdminPackage(db, slug, fields, actorId) {
  const before = await getAdminPackage(db, slug);
  if (!before) return { ok: false, error: "not_found" };
  const changes = describePackageChanges(before, fields);
  const result = await db.collection("pricingPackage").updateOne({ slug }, { $set: { ...fields, updatedAt: new Date() } });
  if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
  if (fields.featured) await clearOtherFeatured(db, slug);
  await appendAuditEvent(db, { actorId, action: "catalog.package.updated", targetType: "Package", targetId: slug, outcome: "success", details: changes });
  return { ok: true, changed: Object.keys(changes).length };
}

export async function setAdminPackageActive(db, slug, active, actorId) {
  const result = await db.collection("pricingPackage").updateOne({ slug }, { $set: { active: Boolean(active), updatedAt: new Date() } });
  if (result.matchedCount !== 1) return { ok: false, error: "not_found" };
  await appendAuditEvent(db, { actorId, action: active ? "catalog.package.activated" : "catalog.package.deactivated", targetType: "Package", targetId: slug, outcome: "success" });
  return { ok: true };
}

// Copies the built-in packages into the collection so the editor can manage them. Only when empty:
// the first saved package would otherwise replace the built-in ones on the public site.
export async function importDefaultPackages(db, filePackages, actorId) {
  const existing = await db.collection("pricingPackage").countDocuments({});
  if (existing > 0) return { ok: false, error: "not_empty" };
  const now = new Date();
  const docs = filePackages.map((pkg, index) => ({
    slug: pkg.slug,
    name: pkg.name,
    note: pkg.note,
    priceMinorUnits: pkg.priceMinorUnits,
    inclusions: [...pkg.inclusions],
    featured: Boolean(pkg.featured),
    active: pkg.active !== false,
    displayOrder: index + 1,
    bookingServiceSlugs: [...pkg.bookingServiceSlugs],
    currency: "USD",
    createdAt: now,
    updatedAt: now,
  }));
  await db.collection("pricingPackage").insertMany(docs);
  await appendAuditEvent(db, { actorId, action: "catalog.package.imported", targetType: "Package", targetId: null, outcome: "success", details: { count: String(docs.length) } });
  return { ok: true, count: docs.length };
}
