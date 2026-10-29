import { z } from "zod";
import { SERVICE_CATEGORIES, SERVICE_ICONS } from "@/lib/catalog/normalize";

// Validation and form parsing for the admin service editor (pure: no database, no server APIs).
// Only the keys listed here are ever read from a form, and the schemas are strict, so a crafted
// request cannot set other fields (mass-assignment protection).

export const SERVICE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// "25" -> 2500, "25.5" -> 2550, "25.50" -> 2550; anything else (or zero) -> null.
export function parsePriceToMinorUnits(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return minor > 0 ? minor : null;
}

export const serviceFieldsSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120, "Use at most 120 characters."),
  description: z.string().trim().max(500, "Use at most 500 characters."),
  durationMinutes: z.number().int("Enter whole minutes.").min(5, "At least 5 minutes.").max(480, "At most 480 minutes."),
  priceMinorUnits: z.number().int().min(1, "Enter a price like 25 or 25.50.").max(999_999),
  active: z.boolean(),
  displayOrder: z.number().int("Enter a whole number.").min(0, "Use 0 or more.").max(999, "Use 999 or less."),
  category: z.enum(SERVICE_CATEGORIES, { message: "Choose a category." }),
  icon: z.enum(SERVICE_ICONS, { message: "Choose an icon." }),
}).strict();

export const serviceCreateSchema = serviceFieldsSchema.extend({
  slug: z.string().trim().min(2, "Use at least 2 characters.").max(60, "Use at most 60 characters.").regex(SERVICE_SLUG_PATTERN, "Use lowercase letters, numbers and hyphens."),
}).strict();

function text(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function wholeNumber(value) {
  return /^\d{1,4}$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
}

// Reads exactly the known keys from a FormData-like object and validates them.
// Returns { ok: true, data } or { ok: false, fieldErrors: { field: message } }.
export function readServiceForm(formData, { withSlug }) {
  const price = parsePriceToMinorUnits(text(formData, "price"));
  const candidate = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    durationMinutes: wholeNumber(text(formData, "durationMinutes")),
    priceMinorUnits: price ?? 0,
    active: formData.get("active") === "on",
    displayOrder: wholeNumber(text(formData, "displayOrder")),
    category: text(formData, "category"),
    icon: text(formData, "icon"),
    ...(withSlug ? { slug: text(formData, "slug").trim().toLowerCase() } : {}),
  };
  const parsed = (withSlug ? serviceCreateSchema : serviceFieldsSchema).safeParse(candidate);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] === "priceMinorUnits" ? "price" : String(issue.path[0] ?? "form");
    fieldErrors[key] ??= Number.isNaN(candidate[issue.path[0]]) ? "Enter a number." : issue.message;
  }
  if (price === null && text(formData, "price") !== "") fieldErrors.price = "Enter a price like 25 or 25.50.";
  return { ok: false, fieldErrors };
}

// Short, non-sensitive description of what changed, for the audit log ("price: 2500->3000").
export function describeChanges(before, after) {
  const keys = ["name", "description", "durationMinutes", "priceMinorUnits", "active", "displayOrder", "category", "icon"];
  const details = {};
  for (const key of keys) {
    if (before[key] === after[key]) continue;
    details[key] = ["name", "description"].includes(key) ? "changed" : `${before[key]}->${after[key]}`;
  }
  return details;
}
