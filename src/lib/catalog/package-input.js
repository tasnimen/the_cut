import { z } from "zod";
import { SERVICE_SLUG_PATTERN, parsePriceToMinorUnits } from "@/lib/catalog/service-input";

// Validation and form parsing for the admin pricing-package editor (pure). Same rules as the
// service editor: only known keys are read, schemas are strict, slugs and prices are validated.

export function parseInclusions(text) {
  if (typeof text !== "string") return [];
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export const packageFieldsSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80, "Use at most 80 characters."),
  note: z.string().trim().max(200, "Use at most 200 characters."),
  priceMinorUnits: z.number().int().min(1, "Enter a price like 40 or 40.00.").max(999_999),
  inclusions: z.array(z.string().trim().min(1).max(80, "Each line can have at most 80 characters.")).min(1, "Add at least one included item.").max(12, "Use at most 12 items."),
  featured: z.boolean(),
  active: z.boolean(),
  displayOrder: z.number().int("Enter a whole number.").min(0, "Use 0 or more.").max(999, "Use 999 or less."),
  bookingServiceSlugs: z.array(z.string().regex(SERVICE_SLUG_PATTERN)).max(3, "Choose at most 3 services."),
}).strict();

export const packageCreateSchema = packageFieldsSchema.extend({
  slug: z.string().trim().min(2, "Use at least 2 characters.").max(60, "Use at most 60 characters.").regex(SERVICE_SLUG_PATTERN, "Use lowercase letters, numbers and hyphens."),
}).strict();

function text(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function wholeNumber(value) {
  return /^\d{1,4}$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
}

// allowedServiceSlugs: slugs of existing services; anything else is rejected, not silently dropped.
export function readPackageForm(formData, { withSlug, allowedServiceSlugs = [] }) {
  const price = parsePriceToMinorUnits(text(formData, "price"));
  const picked = (typeof formData.getAll === "function" ? formData.getAll("bookingServiceSlugs") : []).filter((value) => typeof value === "string");
  const candidate = {
    name: text(formData, "name"),
    note: text(formData, "note"),
    priceMinorUnits: price ?? 0,
    inclusions: parseInclusions(text(formData, "inclusions")),
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
    displayOrder: wholeNumber(text(formData, "displayOrder")),
    bookingServiceSlugs: [...new Set(picked)],
    ...(withSlug ? { slug: text(formData, "slug").trim().toLowerCase() } : {}),
  };
  const parsed = (withSlug ? packageCreateSchema : packageFieldsSchema).safeParse(candidate);
  const fieldErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] === "priceMinorUnits" ? "price" : String(issue.path[0] ?? "form");
      fieldErrors[key] ??= Number.isNaN(candidate[issue.path[0]]) ? "Enter a number." : issue.message;
    }
  }
  if (price === null && text(formData, "price") !== "") fieldErrors.price = "Enter a price like 40 or 40.00.";
  if (candidate.bookingServiceSlugs.some((slug) => !allowedServiceSlugs.includes(slug))) fieldErrors.bookingServiceSlugs = "Choose services from the list.";
  if (Object.keys(fieldErrors).length > 0 || !parsed.success) return { ok: false, fieldErrors };
  return { ok: true, data: parsed.data };
}

export function describePackageChanges(before, after) {
  const details = {};
  for (const key of ["name", "note", "priceMinorUnits", "featured", "active", "displayOrder"]) {
    if (before[key] !== after[key]) details[key] = ["name", "note"].includes(key) ? "changed" : `${before[key]}->${after[key]}`;
  }
  if (before.inclusions.join("\n") !== after.inclusions.join("\n")) details.inclusions = `${before.inclusions.length}->${after.inclusions.length} items`;
  if (before.bookingServiceSlugs.join(",") !== after.bookingServiceSlugs.join(",")) details.bookingServiceSlugs = "changed";
  return details;
}
