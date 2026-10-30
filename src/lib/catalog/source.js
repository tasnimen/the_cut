import "server-only";
import { hideArchived } from "@/lib/catalog/archive";
import { unstable_cache } from "next/cache";
import { BOOKING_CONFIG } from "@/config/booking";
import { site } from "@/config/site";
import { BOOKING_SERVICES } from "@/config/booking-services";
import { TEAM_PROFILES } from "@/config/team-profiles";
import { PRICING_PACKAGES } from "@/config/pricing-packages";
import { getMongo } from "@/lib/db/mongo";
import { normalizePublicBarbers } from "@/lib/catalog/barbers";
import { mergeBookingConfig, normalizeHolidays } from "@/lib/catalog/holidays";
import { normalizePackages, normalizeServices, resolveCatalog } from "@/lib/catalog/normalize";
import { SETTING_KEYS, docsToMap, mergeSiteSettings, normalizeHours } from "@/lib/catalog/settings";
import { normalizePublicGallery } from "@/lib/gallery/gallery-input";
import { createCooldown } from "@/lib/utils/cooldown";
import { CATALOG_REVALIDATE_SECONDS, CATALOG_TAGS } from "@/lib/catalog/tags";

const DB_COOLDOWN_MS = 30_000;
const servicesCooldown = createCooldown({ ms: DB_COOLDOWN_MS });
const packagesCooldown = createCooldown({ ms: DB_COOLDOWN_MS });
const barbersCooldown = createCooldown({ ms: DB_COOLDOWN_MS });
const settingsCooldown = createCooldown({ ms: DB_COOLDOWN_MS });
const galleryCooldown = createCooldown({ ms: DB_COOLDOWN_MS });

// Public catalog reads: MongoDB first (cached, tagged), file data as the fallback.
// A failed query throws inside the cached function, so failures are never cached; resolveCatalog then
// serves the file data. Admin saves call revalidateCatalog() (lib/catalog/revalidate.js).

const SERVICE_PROJECTION = { _id: 0, archivedAt: 1, slug: 1, name: 1, description: 1, durationMinutes: 1, priceMinorUnits: 1, active: 1, displayOrder: 1, category: 1, icon: 1, image: 1 };
const PACKAGE_PROJECTION = { _id: 0, archivedAt: 1, slug: 1, name: 1, priceMinorUnits: 1, note: 1, inclusions: 1, featured: 1, active: 1, displayOrder: 1, bookingServiceSlugs: 1, image: 1 };

const loadServiceDocuments = unstable_cache(
  async () => {
    const { db } = await getMongo();
    return hideArchived(await db.collection("service").find({}, { projection: SERVICE_PROJECTION }).limit(100).toArray());
  },
  ["catalog-services-v1"],
  { tags: [CATALOG_TAGS.services], revalidate: CATALOG_REVALIDATE_SECONDS },
);

// Only fields safe for the public site are read: never schedules, service assignments or timestamps.
const BARBER_PROJECTION = { _id: 0, archivedAt: 1, slug: 1, name: 1, role: 1, focus: 1, active: 1, publicProfile: 1, displayOrder: 1, image: 1 };

const loadBarberDocuments = unstable_cache(
  async () => {
    const { db } = await getMongo();
    return hideArchived(await db.collection("barber").find({ publicProfile: true }, { projection: BARBER_PROJECTION }).limit(30).toArray());
  },
  ["catalog-barbers-v1"],
  { tags: [CATALOG_TAGS.barbers], revalidate: CATALOG_REVALIDATE_SECONDS },
);

// All business settings (hours, closed dates, contact, social) in one cached read.
const loadSettingDocuments = unstable_cache(
  async () => {
    const { db } = await getMongo();
    return db.collection("siteSetting").find({ key: { $in: SETTING_KEYS } }, { projection: { _id: 0, key: 1, value: 1 } }).limit(10).toArray();
  },
  ["catalog-settings-v1"],
  { tags: [CATALOG_TAGS.settings], revalidate: CATALOG_REVALIDATE_SECONDS },
);

const loadPackageDocuments = unstable_cache(
  async () => {
    const { db } = await getMongo();
    return hideArchived(await db.collection("pricingPackage").find({}, { projection: PACKAGE_PROJECTION }).limit(50).toArray());
  },
  ["catalog-packages-v1"],
  { tags: [CATALOG_TAGS.packages], revalidate: CATALOG_REVALIDATE_SECONDS },
);

// Shop-uploaded gallery photos: only active items and an allow-list of fields (never the provider's delete
// address or who uploaded). Any failure means "no uploaded photos", and the built-in gallery is shown.
const GALLERY_PROJECTION = { title: 1, category: 1, alt: 1, active: 1, displayUrl: 1, width: 1, height: 1, createdAt: 1 };

const loadGalleryDocuments = unstable_cache(
  async () => {
    const { db } = await getMongo();
    const docs = await db.collection("galleryItem").find({ active: true }, { projection: GALLERY_PROJECTION }).sort({ createdAt: -1 }).limit(60).toArray();
    return docs.map((doc) => ({ id: String(doc._id), title: doc.title, category: doc.category, alt: doc.alt, active: doc.active, displayUrl: doc.displayUrl, width: doc.width, height: doc.height, createdAt: new Date(doc.createdAt).toISOString() }));
  },
  ["catalog-gallery-v1"],
  { tags: [CATALOG_TAGS.gallery], revalidate: CATALOG_REVALIDATE_SECONDS },
);

export async function getPublicGallery() {
  try {
    return normalizePublicGallery(await galleryCooldown(loadGalleryDocuments));
  } catch {
    return { items: [], images: {} };
  }
}

export function getPublicServices() {
  return resolveCatalog({ fetchDocuments: () => servicesCooldown(loadServiceDocuments), normalize: normalizeServices, fileData: BOOKING_SERVICES });
}

export function getPublicPackages() {
  return resolveCatalog({ fetchDocuments: () => packagesCooldown(loadPackageDocuments), normalize: normalizePackages, fileData: PRICING_PACKAGES });
}

export function getPublicBarbers() {
  return resolveCatalog({ fetchDocuments: () => barbersCooldown(loadBarberDocuments), normalize: normalizePublicBarbers, fileData: TEAM_PROFILES });
}

async function loadSettingsMap() {
  try {
    return docsToMap(await settingsCooldown(loadSettingDocuments));
  } catch {
    return {};
  }
}

// The booking policy with the saved opening hours and closed dates (file defaults when unset or
// unreachable). Pass the result to the booking engine and to anything that lists hours or closures,
// so they always agree.
export async function getBookingConfig() {
  const map = await loadSettingsMap();
  return mergeBookingConfig({ ...BOOKING_CONFIG, openingHours: normalizeHours(map.hours, BOOKING_CONFIG.openingHours) }, normalizeHolidays(map.holidays, BOOKING_CONFIG.holidays));
}

// Public contact details, social links and address (database over the file defaults in config/site.js).
export async function getSiteSettings() {
  return mergeSiteSettings(await loadSettingsMap(), site);
}
