"use server";

import { redirect } from "next/navigation";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { createAdminBarber, setAdminBarberActive, updateAdminBarber } from "@/lib/catalog/admin-barbers";
import { archiveMessage, archiveRecord, restoreRecord } from "@/lib/catalog/archive";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { readBarberForm } from "@/lib/catalog/barber-input";
import { PICTURE_FAILED_MESSAGE, readPicture, savePicture } from "@/lib/catalog/image-action";
import { revalidateCatalog } from "@/lib/catalog/revalidate";
import { SERVICE_SLUG_PATTERN } from "@/lib/catalog/service-input";
import { ensureApplicationIndexes, getMongo } from "@/lib/db/mongo";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export is a public HTTP endpoint: each call re-checks session, role, TOTP and permission.

const RATE = { bucket: "admin-barbers", limit: 30, windowMs: 60_000 };
const ARCHIVED_REPLY = { status: "error", code: "archived", message: "That barber is archived. Restore it first." };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };

async function authorize(capability) {
  try {
    const principal = await requirePrincipal("barbersManageAll", { capability });
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many changes in a short time. Wait a moment and try again." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

async function allowedServiceSlugs(db) {
  return (await listAdminServices(db)).map((service) => service.slug);
}

export async function createBarberAction(_previous, formData) {
  const auth = await authorize("barbers.create");
  if (auth.error) return auth.error;

  const { db } = await getMongo();
  const parsed = readBarberForm(formData, { withSlug: true, allowedServiceSlugs: await allowedServiceSlugs(db) });
  if (!parsed.ok) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors, values: parsed.values };

  await ensureApplicationIndexes(db);
  const picture = await readPicture(db, { kind: "barbers", slug: parsed.data.slug, formData, principal: auth.principal });
  if (picture.denied) return DENIED;
  if (!picture.ok) return { status: "error", code: "invalid", message: picture.message, fieldErrors: picture.fieldErrors, values: parsed.values };
  const result = await createAdminBarber(db, parsed.data, auth.principal.id);
  if (!result.ok) return { status: "error", code: "duplicate", message: "That identifier is already in use.", fieldErrors: { slug: "That identifier is already in use." }, values: parsed.values };

  const saved = await savePicture(db, { kind: "barbers", slug: parsed.data.slug, fields: picture.fields, principal: auth.principal });
  revalidateCatalog(["barbers"]);
  if (!saved.ok) return { status: "error", code: "picture_failed", message: PICTURE_FAILED_MESSAGE, values: parsed.values };
  redirect("/admin/barbers");
}

export async function updateBarberAction(slug, _previous, formData) {
  const auth = await authorize("barbers.edit");
  if (auth.error) return auth.error;
  if (typeof slug !== "string" || !SERVICE_SLUG_PATTERN.test(slug)) return { status: "error", code: "not_found", message: "That barber was not found." };

  const { db } = await getMongo();
  const parsed = readBarberForm(formData, { withSlug: false, allowedServiceSlugs: await allowedServiceSlugs(db) });
  if (!parsed.ok) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors, values: parsed.values };

  const picture = await readPicture(db, { kind: "barbers", slug, formData, principal: auth.principal });
  if (picture.denied) return DENIED;
  if (!picture.ok) return { status: "error", code: "invalid", message: picture.message, fieldErrors: picture.fieldErrors, values: parsed.values };
  const result = await updateAdminBarber(db, slug, parsed.data, auth.principal.id);
  if (!result.ok) return result.error === "archived" ? ARCHIVED_REPLY : { status: "error", code: "not_found", message: "That barber was not found." };

  const saved = await savePicture(db, { kind: "barbers", slug, fields: picture.fields, principal: auth.principal });
  revalidateCatalog(["barbers"]);
  if (!saved.ok) return { status: "error", code: "picture_failed", message: PICTURE_FAILED_MESSAGE, values: parsed.values };
  return { status: "success", code: "saved", message: "Saved. New bookings use these hours straight away; existing appointments are not moved." };
}

export async function setBarberActiveAction(slug, active) {
  const auth = await authorize("barbers.edit");
  if (auth.error) return auth.error;
  if (typeof slug !== "string" || !SERVICE_SLUG_PATTERN.test(slug) || typeof active !== "boolean") return { status: "error", code: "invalid", message: "That request was not valid." };

  const { db } = await getMongo();
  const result = await setAdminBarberActive(db, slug, active, auth.principal.id);
  if (!result.ok) return result.error === "archived" ? ARCHIVED_REPLY : { status: "error", code: "not_found", message: "That barber was not found." };

  revalidateCatalog(["barbers"]);
  return { status: "success", code: active ? "activated" : "deactivated", message: active ? "Barber can be booked again." : "Barber is hidden from booking. Existing appointments are unchanged." };
}

// Archive and restore (unit D2a). Each call re-checks the session, role, TOTP and its own Super Admin switch
// (barbers.archive / barbers.restore, default off), then the slug, and the barber rule lives in the repository.
async function barberArchiveChange(restoring, slug) {
  const auth = await authorize(restoring ? "barbers.restore" : "barbers.archive");
  if (auth.error) return auth.error;
  if (typeof slug !== "string" || !SERVICE_SLUG_PATTERN.test(slug)) return { status: "error", code: "invalid", message: "That request was not valid." };

  const { db } = await getMongo();
  const result = await (restoring ? restoreRecord : archiveRecord)(db, "barbers", slug, auth.principal.id);
  const message = archiveMessage("barbers", result, restoring);
  if (!result.ok) return { status: "error", code: result.error, message };

  revalidateCatalog(["barbers"]);
  return { status: "success", code: restoring ? "restored" : "archived", message };
}

export async function archiveBarberAction(slug) {
  return barberArchiveChange(false, slug);
}

export async function restoreBarberAction(slug) {
  return barberArchiveChange(true, slug);
}
