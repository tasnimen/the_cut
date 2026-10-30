"use server";

import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { saveSetting } from "@/lib/catalog/admin-settings";
import { revalidateCatalog } from "@/lib/catalog/revalidate";
import { readContactForm, readHoursForm, readHolidaysForm, readSocialForm } from "@/lib/catalog/settings-input";
import { ensureApplicationIndexes, getMongo } from "@/lib/db/mongo";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";

// Every export is a public HTTP endpoint: each call re-checks session, role, TOTP and permission.

const RATE = { bucket: "admin-settings", limit: 20, windowMs: 60_000 };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };

async function authorize() {
  try {
    const principal = await requirePrincipal("businessSettingsManage", { capability: "settings.edit" });
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { error: { status: "error", code: "rate", message: "Too many changes in a short time. Wait a moment and try again." } };
    return { principal };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: DENIED };
    throw error;
  }
}

async function saveWith(key, reader, formData) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const parsed = reader(formData);
  if (!parsed.ok) return { status: "error", code: "invalid", message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors, values: parsed.values };

  const { db } = await getMongo();
  await ensureApplicationIndexes(db);
  await saveSetting(db, key, parsed.data, auth.principal.id);
  revalidateCatalog(["settings"]);
  return { status: "success", code: "saved", message: "Saved. The public site will show the change shortly.", values: parsed.values };
}

export async function saveHoursAction(_previous, formData) {
  return saveWith("hours", readHoursForm, formData);
}

export async function saveHolidaysAction(_previous, formData) {
  return saveWith("holidays", readHolidaysForm, formData);
}

export async function saveContactAction(_previous, formData) {
  return saveWith("contact", readContactForm, formData);
}

export async function saveSocialAction(_previous, formData) {
  return saveWith("social", readSocialForm, formData);
}
