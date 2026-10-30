"use server";

import { redirect } from "next/navigation";
import { PRICING_PACKAGES } from "@/config/pricing-packages";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { createAdminPackage, importDefaultPackages, setAdminPackageActive, updateAdminPackage } from "@/lib/catalog/admin-packages";
import { archiveMessage, archiveRecord, restoreRecord } from "@/lib/catalog/archive";
import { readPackageForm } from "@/lib/catalog/package-input";
import { PICTURE_FAILED_MESSAGE, readPicture, savePicture } from "@/lib/catalog/image-action";
import { revalidateCatalog } from "@/lib/catalog/revalidate";
import { SERVICE_SLUG_PATTERN } from "@/lib/catalog/service-input";
import { ensureApplicationIndexes, getMongo } from "@/lib/db/mongo";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export is a public HTTP endpoint: each call re-checks session, role, TOTP and permission.

const RATE = { bucket: "admin-packages", limit: 30, windowMs: 60_000 };
const ARCHIVED_REPLY = { status: "error", code: "archived", message: "That package is archived. Restore it first." };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };

async function authorize(capability) {
  try {
    const principal = await requirePrincipal("packagesManageAll", { capability });
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many changes in a short time. Wait a moment and try again." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

function valuesOf(formData) {
  const text = (key) => (typeof formData.get(key) === "string" ? formData.get(key).slice(0, 1200) : "");
  return {
    slug: text("slug"), name: text("name"), note: text("note"), price: text("price"), inclusions: text("inclusions"), displayOrder: text("displayOrder"),
    featured: formData.get("featured") === "on", active: formData.get("active") === "on",
    bookingServiceSlugs: typeof formData.getAll === "function" ? formData.getAll("bookingServiceSlugs").filter((value) => typeof value === "string").slice(0, 10) : [],
  };
}

async function allowedServiceSlugs(db) {
  return (await listAdminServices(db)).map((service) => service.slug);
}

export async function createPackageAction(_previous, formData) {
  const auth = await authorize("packages.create");
  if (auth.error) return auth.error;

  const { db } = await getMongo();
  const parsed = readPackageForm(formData, { withSlug: true, allowedServiceSlugs: await allowedServiceSlugs(db) });
  if (!parsed.ok) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors, values: valuesOf(formData) };

  await ensureApplicationIndexes(db);
  const picture = await readPicture(db, { kind: "packages", slug: parsed.data.slug, formData, principal: auth.principal });
  if (picture.denied) return DENIED;
  if (!picture.ok) return { status: "error", code: "invalid", message: picture.message, fieldErrors: picture.fieldErrors, values: valuesOf(formData) };
  const result = await createAdminPackage(db, parsed.data, auth.principal.id);
  if (!result.ok) return { status: "error", code: "duplicate", message: "That identifier is already in use.", fieldErrors: { slug: "That identifier is already in use." }, values: valuesOf(formData) };

  const saved = await savePicture(db, { kind: "packages", slug: parsed.data.slug, fields: picture.fields, principal: auth.principal });
  revalidateCatalog(["packages"]);
  if (!saved.ok) return { status: "error", code: "picture_failed", message: PICTURE_FAILED_MESSAGE, values: valuesOf(formData) };
  redirect("/admin/packages");
}

export async function updatePackageAction(slug, _previous, formData) {
  const auth = await authorize("packages.edit");
  if (auth.error) return auth.error;
  if (typeof slug !== "string" || !SERVICE_SLUG_PATTERN.test(slug)) return { status: "error", code: "not_found", message: "That package was not found." };

  const { db } = await getMongo();
  const parsed = readPackageForm(formData, { withSlug: false, allowedServiceSlugs: await allowedServiceSlugs(db) });
  if (!parsed.ok) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors, values: valuesOf(formData) };

  const picture = await readPicture(db, { kind: "packages", slug, formData, principal: auth.principal });
  if (picture.denied) return DENIED;
  if (!picture.ok) return { status: "error", code: "invalid", message: picture.message, fieldErrors: picture.fieldErrors, values: valuesOf(formData) };
  const result = await updateAdminPackage(db, slug, parsed.data, auth.principal.id);
  if (!result.ok) return result.error === "archived" ? ARCHIVED_REPLY : { status: "error", code: "not_found", message: "That package was not found." };

  const saved = await savePicture(db, { kind: "packages", slug, fields: picture.fields, principal: auth.principal });
  revalidateCatalog(["packages"]);
  if (!saved.ok) return { status: "error", code: "picture_failed", message: PICTURE_FAILED_MESSAGE, values: valuesOf(formData) };
  return { status: "success", code: "saved", message: "Saved. The public site will show the change shortly.", values: valuesOf(formData) };
}

export async function setPackageActiveAction(slug, active) {
  const auth = await authorize("packages.edit");
  if (auth.error) return auth.error;
  if (typeof slug !== "string" || !SERVICE_SLUG_PATTERN.test(slug) || typeof active !== "boolean") return { status: "error", code: "invalid", message: "That request was not valid." };

  const { db } = await getMongo();
  const result = await setAdminPackageActive(db, slug, active, auth.principal.id);
  if (!result.ok) return result.error === "archived" ? ARCHIVED_REPLY : { status: "error", code: "not_found", message: "That package was not found." };

  revalidateCatalog(["packages"]);
  return { status: "success", code: active ? "activated" : "deactivated", message: active ? "Package is now shown on the site." : "Package is now hidden from the site." };
}

export async function importDefaultPackagesAction() {
  const auth = await authorize("packages.create");
  if (auth.error) return auth.error;

  const { db } = await getMongo();
  await ensureApplicationIndexes(db);
  const result = await importDefaultPackages(db, PRICING_PACKAGES, auth.principal.id);
  if (!result.ok) return { status: "error", code: "not_empty", message: "Packages already exist, so nothing was imported." };

  revalidateCatalog(["packages"]);
  return { status: "success", code: "imported", message: `Imported ${result.count} packages. You can now edit them.` };
}

// Archive and restore (unit D2a). Each call re-checks the session, role, TOTP and its own Super Admin switch
// (packages.archive / packages.restore, default off), then the slug, and the barber rule lives in the repository.
async function packageArchiveChange(restoring, slug) {
  const auth = await authorize(restoring ? "packages.restore" : "packages.archive");
  if (auth.error) return auth.error;
  if (typeof slug !== "string" || !SERVICE_SLUG_PATTERN.test(slug)) return { status: "error", code: "invalid", message: "That request was not valid." };

  const { db } = await getMongo();
  const result = await (restoring ? restoreRecord : archiveRecord)(db, "packages", slug, auth.principal.id);
  const message = archiveMessage("packages", result, restoring);
  if (!result.ok) return { status: "error", code: result.error, message };

  revalidateCatalog(["packages"]);
  return { status: "success", code: restoring ? "restored" : "archived", message };
}

export async function archivePackageAction(slug) {
  return packageArchiveChange(false, slug);
}

export async function restorePackageAction(slug) {
  return packageArchiveChange(true, slug);
}
