"use server";

import { redirect } from "next/navigation";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { createAdminService, setAdminServiceActive, updateAdminService } from "@/lib/catalog/admin-services";
import { PICTURE_FAILED_MESSAGE, readPicture, savePicture } from "@/lib/catalog/image-action";
import { revalidateCatalog } from "@/lib/catalog/revalidate";
import { readServiceForm, SERVICE_SLUG_PATTERN } from "@/lib/catalog/service-input";
import { ensureApplicationIndexes, getMongo } from "@/lib/db/mongo";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export below is a public HTTP endpoint (Server Action): it re-checks the session, role,
// TOTP enrolment and permission on EVERY call, whatever the UI showed. Never trust the page.

const RATE = { bucket: "admin-services", limit: 30, windowMs: 60_000 };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };

async function authorize() {
  try {
    const principal = await requirePrincipal("servicesManageAll");
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many changes in a short time. Wait a moment and try again." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

function valuesOf(formData) {
  const text = (key) => (typeof formData.get(key) === "string" ? formData.get(key).slice(0, 600) : "");
  return { slug: text("slug"), name: text("name"), description: text("description"), price: text("price"), durationMinutes: text("durationMinutes"), displayOrder: text("displayOrder"), category: text("category"), icon: text("icon"), active: formData.get("active") === "on" };
}

export async function createServiceAction(_previous, formData) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const parsed = readServiceForm(formData, { withSlug: true });
  if (!parsed.ok) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors, values: valuesOf(formData) };

  const { db } = await getMongo();
  await ensureApplicationIndexes(db);
  const picture = await readPicture(db, { kind: "services", slug: parsed.data.slug, formData, principal: auth.principal });
  if (picture.denied) return DENIED;
  if (!picture.ok) return { status: "error", code: "invalid", message: picture.message, fieldErrors: picture.fieldErrors, values: valuesOf(formData) };
  const result = await createAdminService(db, parsed.data, auth.principal.id);
  if (!result.ok) return { status: "error", code: "duplicate", message: "That identifier is already in use.", fieldErrors: { slug: "That identifier is already in use." }, values: valuesOf(formData) };

  const saved = await savePicture(db, { kind: "services", slug: parsed.data.slug, fields: picture.fields, principal: auth.principal });
  revalidateCatalog(["services"]);
  if (!saved.ok) return { status: "error", code: "picture_failed", message: PICTURE_FAILED_MESSAGE, values: valuesOf(formData) };
  redirect("/admin/services");
}

export async function updateServiceAction(slug, _previous, formData) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  if (typeof slug !== "string" || !SERVICE_SLUG_PATTERN.test(slug)) return { status: "error", code: "not_found", message: "That service was not found." };

  const parsed = readServiceForm(formData, { withSlug: false });
  if (!parsed.ok) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors, values: valuesOf(formData) };

  const { db } = await getMongo();
  const picture = await readPicture(db, { kind: "services", slug, formData, principal: auth.principal });
  if (picture.denied) return DENIED;
  if (!picture.ok) return { status: "error", code: "invalid", message: picture.message, fieldErrors: picture.fieldErrors, values: valuesOf(formData) };
  const result = await updateAdminService(db, slug, parsed.data, auth.principal.id);
  if (!result.ok) return { status: "error", code: "not_found", message: "That service was not found." };

  const saved = await savePicture(db, { kind: "services", slug, fields: picture.fields, principal: auth.principal });
  revalidateCatalog(["services"]);
  if (!saved.ok) return { status: "error", code: "picture_failed", message: PICTURE_FAILED_MESSAGE, values: valuesOf(formData) };
  return { status: "success", code: "saved", message: "Saved. The public site will show the change shortly.", values: valuesOf(formData) };
}

export async function setServiceActiveAction(slug, active) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  if (typeof slug !== "string" || !SERVICE_SLUG_PATTERN.test(slug) || typeof active !== "boolean") return { status: "error", code: "invalid", message: "That request was not valid." };

  const { db } = await getMongo();
  const result = await setAdminServiceActive(db, slug, active, auth.principal.id);
  if (!result.ok) return { status: "error", code: "not_found", message: "That service was not found." };

  revalidateCatalog(["services"]);
  return { status: "success", code: active ? "activated" : "deactivated", message: active ? "Service is now shown on the site." : "Service is now hidden from the site." };
}
