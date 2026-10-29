import { isValidTime } from "@/lib/catalog/holidays";

// Pure rules for the business settings stored in `siteSetting` documents (key: hours | holidays |
// contact | social). The file values (config/booking.js, config/site.js) are the defaults. Every
// value from the database is validated again here, so a malformed or tampered document can never
// put a script URL, a broken phone link or a closed shop onto the public site.

export const SETTING_KEYS = Object.freeze(["hours", "holidays", "contact", "social"]);
export const DAYS = Object.freeze(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

export const SOCIAL_PLATFORMS = Object.freeze({
  instagram: Object.freeze(["instagram.com"]),
  facebook: Object.freeze(["facebook.com", "fb.com"]),
  tiktok: Object.freeze(["tiktok.com"]),
  x: Object.freeze(["x.com", "twitter.com"]),
  youtube: Object.freeze(["youtube.com", "youtu.be"]),
});

export function docsToMap(documents) {
  const map = {};
  if (!Array.isArray(documents)) return map;
  for (const doc of documents) {
    if (doc && SETTING_KEYS.includes(doc.key) && doc.value && typeof doc.value === "object") map[doc.key] = doc.value;
  }
  return map;
}

export function isValidPhone(value) {
  if (typeof value !== "string" || !/^[0-9+().\-\s]{7,30}$/.test(value.trim())) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

export function isValidEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

// Returns the cleaned https URL, or null when it is not a profile URL on the platform's own domain.
export function safeSocialUrl(platform, value) {
  const domains = SOCIAL_PLATFORMS[platform];
  if (!domains || typeof value !== "string" || value.length > 200) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return domains.some((domain) => host === domain || host.endsWith(`.${domain}`)) ? url.toString() : null;
  } catch {
    return null;
  }
}

// A saved hours document is authoritative for which days are open (a missing day means closed).
// A document with no valid day at all is ignored so a bad save cannot close the whole shop.
export function normalizeHours(value, fileHours) {
  if (!value || typeof value !== "object") return fileHours;
  const hours = {};
  for (const day of DAYS) {
    const entry = value[day];
    if (entry && isValidTime(entry.open) && isValidTime(entry.close) && entry.open < entry.close) hours[day] = Object.freeze({ open: entry.open, close: entry.close });
  }
  return Object.keys(hours).length > 0 ? Object.freeze(hours) : fileHours;
}

function pick(doc, key, validate, fallback) {
  if (!doc || !(key in doc)) return fallback;
  const raw = doc[key];
  if (raw === null || raw === "") return null;
  return validate(raw) ? raw.trim() : fallback;
}

// Combined public view: contact, social and location, from the database over the file defaults.
export function mergeSiteSettings(map, site) {
  const contactDoc = map.contact;
  const socialDoc = map.social;
  return Object.freeze({
    contact: Object.freeze({
      phone: pick(contactDoc, "phone", isValidPhone, site.contact.phone),
      email: pick(contactDoc, "email", isValidEmail, site.contact.email),
    }),
    social: Object.freeze(Object.fromEntries(Object.keys(SOCIAL_PLATFORMS).map((platform) => {
      const raw = socialDoc?.[platform];
      if (socialDoc && platform in socialDoc) return [platform, raw ? safeSocialUrl(platform, raw) : null];
      return [platform, site.social?.[platform] ?? null];
    }))),
    location: Object.freeze({
      ...site.location,
      streetAddress: pick(contactDoc, "streetAddress", (v) => typeof v === "string" && v.trim().length > 0 && v.length <= 120, site.location.streetAddress),
      postalCode: pick(contactDoc, "postalCode", (v) => typeof v === "string" && /^[A-Za-z0-9 -]{3,12}$/.test(v.trim()), site.location.postalCode),
    }),
  });
}
