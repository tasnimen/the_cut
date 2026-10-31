// Pure rules that turn database documents into the public catalog.
//
// - The database is authoritative once it holds any document; the file data is the fallback when the
//   collection is empty or unreachable, so the public site never breaks.
// - Only an allow-list of fields is copied, so internal fields (ids, timestamps, audit data) never
//   reach pages or the browser.
// - Display fields a document lacks (icon, category, description) are filled from the file entry with
//   the same slug, which keeps documents seeded before these fields existed working.

import { publicImage } from "@/lib/catalog/image-input";

export const SERVICE_CATEGORIES = Object.freeze(["haircut", "beard", "shave", "color", "treatment"]);
export const SERVICE_ICONS = Object.freeze(["scissors", "beard", "razor", "sparkle"]);

const isPositiveInt = (value) => Number.isSafeInteger(value) && value > 0;
const cleanText = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function orderOf(document, fallbackIndex) {
  return Number.isFinite(document.displayOrder) ? document.displayOrder : fallbackIndex;
}

const pad = (index) => String(index + 1).padStart(2, "0");

export function normalizeServices(documents, fileServices) {
  const fromFile = () => fileServices.map((service, index) => Object.freeze({
    slug: service.slug,
    name: service.name,
    detail: service.detail,
    durationMinutes: service.durationMinutes,
    priceMinorUnits: service.priceMinorUnits,
    currency: "USD",
    icon: service.icon,
    category: service.category,
    number: pad(index),
  }));

  if (!Array.isArray(documents) || documents.length === 0) return Object.freeze(fromFile());

  const fileBySlug = new Map(fileServices.map((service, index) => [service.slug, { ...service, order: index }]));
  const items = documents
    .filter((doc) => doc && typeof doc.slug === "string" && doc.active !== false && cleanText(doc.name, 120) && isPositiveInt(doc.durationMinutes))
    .map((doc, index) => {
      const base = fileBySlug.get(doc.slug);
      return {
        order: orderOf(doc, base ? base.order : 1000 + index),
        service: {
          slug: doc.slug,
          name: cleanText(doc.name, 120),
          detail: cleanText(doc.description, 500) || base?.detail || "",
          durationMinutes: doc.durationMinutes,
          priceMinorUnits: isPositiveInt(doc.priceMinorUnits) ? doc.priceMinorUnits : null,
          currency: "USD",
          bookable: doc.bookable !== false,
          icon: SERVICE_ICONS.includes(doc.icon) ? doc.icon : base?.icon ?? "scissors",
          category: SERVICE_CATEGORIES.includes(doc.category) ? doc.category : base?.category ?? "haircut",
          image: publicImage(doc.image),
        },
      };
    })
    .sort((a, b) => a.order - b.order || a.service.name.localeCompare(b.service.name));

  return Object.freeze(items.map((item, index) => Object.freeze({ ...item.service, number: pad(index) })));
}

export function normalizePackages(documents, filePackages) {
  const fromFile = () => filePackages
    .filter((pkg) => pkg.active)
    .map((pkg) => Object.freeze({
      slug: pkg.slug,
      name: pkg.name,
      priceMinorUnits: pkg.priceMinorUnits,
      note: pkg.note,
      inclusions: [...pkg.inclusions],
      featured: Boolean(pkg.featured),
      bookingServiceSlugs: [...pkg.bookingServiceSlugs],
    }));

  if (!Array.isArray(documents) || documents.length === 0) return Object.freeze(fromFile());

  const items = documents
    .filter((doc) => doc && typeof doc.slug === "string" && doc.active !== false && cleanText(doc.name, 80) && isPositiveInt(doc.priceMinorUnits))
    .map((doc, index) => ({
      order: orderOf(doc, 1000 + index),
      pkg: {
        slug: doc.slug,
        name: cleanText(doc.name, 80),
        priceMinorUnits: doc.priceMinorUnits,
        note: cleanText(doc.note, 200),
        inclusions: (Array.isArray(doc.inclusions) ? doc.inclusions : []).map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 12),
        featured: doc.featured === true,
        bookingServiceSlugs: (Array.isArray(doc.bookingServiceSlugs) ? doc.bookingServiceSlugs : []).filter((slug) => typeof slug === "string").slice(0, 3),
        image: publicImage(doc.image),
      },
    }))
    .sort((a, b) => a.order - b.order || a.pkg.name.localeCompare(b.pkg.name));

  return Object.freeze(items.map((item) => Object.freeze(item.pkg)));
}

// Loads documents with the given function; any failure falls back to the file data (never throws).
export async function resolveCatalog({ fetchDocuments, normalize, fileData }) {
  try {
    return normalize(await fetchDocuments(), fileData);
  } catch {
    return normalize([], fileData);
  }
}
