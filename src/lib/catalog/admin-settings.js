import { BOOKING_CONFIG } from "@/config/booking";
import { site } from "@/config/site";
import { normalizeHolidays } from "@/lib/catalog/holidays";
import { DAYS, SETTING_KEYS, docsToMap, mergeSiteSettings, normalizeHours } from "@/lib/catalog/settings";
import { appendAuditEvent } from "@/lib/security/audit-log";

// Admin-side reads and writes for the `siteSetting` collection. Callers authorize first
// (requirePrincipal("businessSettingsManage")). Each setting is one document { key, value }.

// What the public site currently uses (database over file defaults): the editor starts from this.
export async function getAdminSettings(db) {
  const docs = await db.collection("siteSetting").find({ key: { $in: SETTING_KEYS } }, { projection: { _id: 0, key: 1, value: 1 } }).limit(10).toArray();
  const map = docsToMap(docs);
  const merged = mergeSiteSettings(map, site);
  return {
    hours: normalizeHours(map.hours, BOOKING_CONFIG.openingHours),
    holidays: normalizeHolidays(map.holidays, BOOKING_CONFIG.holidays),
    contact: { phone: merged.contact.phone, email: merged.contact.email, streetAddress: merged.location.streetAddress, postalCode: merged.location.postalCode },
    social: merged.social,
  };
}

// Never put contact values or URLs into the audit log: only which fields are set.
export function describeSetting(key, value) {
  if (key === "hours") return { openDays: String(DAYS.filter((day) => value[day]).length) };
  if (key === "holidays") return { closedDates: String(value.additionalClosedDates.length), earlyClose: String(Boolean(value.december24EarlyClose)) };
  return Object.fromEntries(Object.entries(value).map(([field, entry]) => [field, entry ? "set" : "empty"]));
}

export async function saveSetting(db, key, value, actorId) {
  if (!SETTING_KEYS.includes(key)) throw new Error("Unknown setting key");
  const now = new Date();
  await db.collection("siteSetting").updateOne({ key }, { $set: { value, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
  await appendAuditEvent(db, { actorId, action: `catalog.settings.${key}_updated`, targetType: "Setting", targetId: key, outcome: "success", details: describeSetting(key, value) });
  return { ok: true };
}

// Form values from the current settings.
export function hoursToValues(hours) {
  return Object.fromEntries(DAYS.map((day) => [day, { works: Boolean(hours[day]), open: hours[day]?.open ?? "09:00", close: hours[day]?.close ?? "17:00" }]));
}

export function holidaysToValues(holidays) {
  return {
    flags: Object.fromEntries(["newYearsDay", "memorialDay", "independenceDay", "laborDay", "thanksgiving", "christmasDay", "december24EarlyClose"].map((key) => [key, Boolean(holidays[key])])),
    earlyCloseAt: holidays.december24EarlyCloseAt,
    datesText: holidays.additionalClosedDates.join("\n"),
  };
}
