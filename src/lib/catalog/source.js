import "server-only";
import { unstable_cache } from "next/cache";
import { BOOKING_SERVICES } from "@/config/booking-services";
import { PRICING_PACKAGES } from "@/config/pricing-packages";
import { getMongo } from "@/lib/db/mongo";
import { normalizePackages, normalizeServices, resolveCatalog } from "@/lib/catalog/normalize";
import { createCooldown } from "@/lib/utils/cooldown";
import { CATALOG_REVALIDATE_SECONDS, CATALOG_TAGS } from "@/lib/catalog/tags";

const DB_COOLDOWN_MS = 30_000;
const servicesCooldown = createCooldown({ ms: DB_COOLDOWN_MS });
const packagesCooldown = createCooldown({ ms: DB_COOLDOWN_MS });

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
