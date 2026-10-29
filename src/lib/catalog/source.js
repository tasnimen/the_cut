import "server-only";
import { unstable_cache } from "next/cache";
import { BOOKING_CONFIG } from "@/config/booking";
import { BOOKING_SERVICES } from "@/config/booking-services";
import { TEAM_PROFILES } from "@/config/team-profiles";
import { PRICING_PACKAGES } from "@/config/pricing-packages";
import { getMongo } from "@/lib/db/mongo";
import { normalizePublicBarbers } from "@/lib/catalog/barbers";
import { mergeBookingConfig, normalizeHolidays } from "@/lib/catalog/holidays";
import { normalizePackages, normalizeServices, resolveCatalog } from "@/lib/catalog/normalize";
import { createCooldown } from "@/lib/utils/cooldown";
import { CATALOG_REVALIDATE_SECONDS, CATALOG_TAGS } from "@/lib/catalog/tags";

const DB_COOLDOWN_MS = 30_000;
const servicesCooldown = createCooldown({ ms: DB_COOLDOWN_MS });
const packagesCooldown = createCooldown({ ms: DB_COOLDOWN_MS });
const barbersCooldown = createCooldown({ ms: DB_COOLDOWN_MS });
const holidaysCooldown = createCooldown({ ms: DB_COOLDOWN_MS });

// Public catalog reads: MongoDB first (cached, tagged), file data as the fallback.
// A failed query throws inside the cached function, so failures are never cached; resolveCatalog then
// serves the file data. Admin saves call revalidateCatalog() (lib/catalog/revalidate.js).

const SERVICE_PROJECTION = { _id: 0, slug: 1, name: 1, description: 1, durationMinutes: 1, priceMinorUnits: 1, active: 1, displayOrder: 1, category: 1, icon: 1 };
const PACKAGE_PROJECTION = { _id: 0, slug: 1, name: 1, priceMinorUnits: 1, note: 1, inclusions: 1, featured: 1, active: 1, displayOrder: 1, bookingServiceSlugs: 1 };

const loadServiceDocuments = unstable_cache(
  async () => {
    const { db } = await getMongo();
    return db.collection("service").find({}, { projection: SERVICE_PROJECTION }).limit(100).toArray();
  },
  ["catalog-services-v1"],
  { tags: [CATALOG_TAGS.services], revalidate: CATALOG_REVALIDATE_SECONDS },
);

// Only fields safe for the public site are read: never schedules, service assignments or timestamps.
const BARBER_PROJECTION = { _id: 0, slug: 1, name: 1, role: 1, focus: 1, active: 1, publicProfile: 1, displayOrder: 1 };

const loadBarberDocuments = unstable_cache(
  async () => {
    const { db } = await getMongo();
    return db.collection("barber").find({ publicProfile: true }, { projection: BARBER_PROJECTION }).limit(30).toArray();
  },
  ["catalog-barbers-v1"],
  { tags: [CATALOG_TAGS.barbers], revalidate: CATALOG_REVALIDATE_SECONDS },
);

const loadHolidaysDocument = unstable_cache(
  async () => {
    const { db } = await getMongo();
    return db.collection("siteSetting").findOne({ key: "holidays" }, { projection: { _id: 0, value: 1 } });
  },
  ["catalog-holidays-v1"],
  { tags: [CATALOG_TAGS.holidays], revalidate: CATALOG_REVALIDATE_SECONDS },
);

const loadPackageDocuments = unstable_cache(
  async () => {
    const { db } = await getMongo();
    return db.collection("pricingPackage").find({}, { projection: PACKAGE_PROJECTION }).limit(50).toArray();
  },
  ["catalog-packages-v1"],
  { tags: [CATALOG_TAGS.packages], revalidate: CATALOG_REVALIDATE_SECONDS },
);

export function getPublicServices() {
  return resolveCatalog({ fetchDocuments: () => servicesCooldown(loadServiceDocuments), normalize: normalizeServices, fileData: BOOKING_SERVICES });
}

export function getPublicPackages() {
  return resolveCatalog({ fetchDocuments: () => packagesCooldown(loadPackageDocuments), normalize: normalizePackages, fileData: PRICING_PACKAGES });
}

export function getPublicBarbers() {
  return resolveCatalog({ fetchDocuments: () => barbersCooldown(loadBarberDocuments), normalize: normalizePublicBarbers, fileData: TEAM_PROFILES });
}

// The booking policy with closed dates from the database (file defaults when unset or unreachable).
// Pass the result to the booking engine and to anything that lists closures, so they always agree.
export async function getBookingConfig() {
  let document = null;
  try {
    document = await holidaysCooldown(loadHolidaysDocument);
  } catch {
    document = null;
  }
  return mergeBookingConfig(BOOKING_CONFIG, normalizeHolidays(document?.value, BOOKING_CONFIG.holidays));
}
