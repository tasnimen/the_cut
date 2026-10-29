import { BOOKING_CONFIG } from "@/config/booking";
import { BOOKING_SERVICES } from "@/config/booking-services";
import { PRICING_PACKAGES } from "@/config/pricing-packages";
import { ROUTES } from "@/config/routes";

const SERVICE_SLUGS = new Set(BOOKING_SERVICES.map((service) => service.slug));

function asList(value) {
  const raw = Array.isArray(value) ? value : [value];
  return raw.filter((item) => typeof item === "string").flatMap((item) => item.split(","));
}

// Turns ?service= / ?package= into slugs from the real catalog. Anything unknown is dropped,
// so a crafted URL can never preselect a service (or price) that does not exist.
export function resolvePreselect({ service, package: packageSlug } = {}) {
  const max = BOOKING_CONFIG.maximumServicesPerBooking;
  const fromServices = [...new Set(asList(service).map((slug) => slug.trim()).filter((slug) => SERVICE_SLUGS.has(slug)))].slice(0, max);
  if (fromServices.length > 0) return fromServices;
  const pkg = PRICING_PACKAGES.find((item) => item.active && item.slug === asList(packageSlug)[0]);
  return pkg ? pkg.bookingServiceSlugs.filter((slug) => SERVICE_SLUGS.has(slug)).slice(0, max) : [];
}

export const bookingHrefForService = (slug) => `${ROUTES.booking}?service=${encodeURIComponent(slug)}`;
export const bookingHrefForPackage = (slug) => `${ROUTES.booking}?package=${encodeURIComponent(slug)}`;
