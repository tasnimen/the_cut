import { describe, expect, it } from "vitest";
import { BOOKING_SERVICES } from "../../config/booking-services.js";
import { PRICING_PACKAGES } from "../../config/pricing-packages.js";
import { normalizePackages, normalizeServices, resolveCatalog } from "./normalize.js";

const doc = (overrides = {}) => ({ _id: "x", slug: "haircut", name: "Haircut", description: "A clean cut.", durationMinutes: 30, priceMinorUnits: 2500, currency: "USD", active: true, createdAt: new Date(), updatedAt: new Date(), ...overrides });

describe("normalizeServices", () => {
  it("falls back to the file catalog when the collection is empty or missing", () => {
    for (const documents of [[], null, undefined]) {
      const services = normalizeServices(documents, BOOKING_SERVICES);
      expect(services.map((service) => service.slug)).toEqual(BOOKING_SERVICES.map((service) => service.slug));
      expect(services[0]).toMatchObject({ name: "Haircut", priceMinorUnits: 2500, number: "01", currency: "USD" });
    }
  });

  it("uses the database once it has documents, and fills display fields from the file by slug", () => {
    const services = normalizeServices([doc({ priceMinorUnits: 3000, name: "Signature Haircut" })], BOOKING_SERVICES);
    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({ slug: "haircut", name: "Signature Haircut", priceMinorUnits: 3000, icon: "scissors", category: "haircut", number: "01" });
  });

  it("hides inactive and malformed documents and sorts by display order", () => {
    const services = normalizeServices([
      doc({ slug: "shave", name: "Shave", displayOrder: 2 }),
      doc({ slug: "beard-trim", name: "Beard Trim", displayOrder: 1 }),
      doc({ slug: "off", name: "Hidden", active: false }),
      doc({ slug: "bad", name: "", durationMinutes: 30 }),
      doc({ slug: "bad2", name: "No duration", durationMinutes: 0 }),
      null,
    ], BOOKING_SERVICES);
    expect(services.map((service) => [service.number, service.slug])).toEqual([["01", "beard-trim"], ["02", "shave"]]);
  });

  it("never invents a price and never leaks internal fields", () => {
    const [service] = normalizeServices([doc({ priceMinorUnits: null }), doc({ slug: "x", priceMinorUnits: 12.5 })].slice(0, 1), BOOKING_SERVICES);
    expect(service.priceMinorUnits).toBeNull();
    expect(Object.keys(service).sort()).toEqual(["category", "currency", "detail", "durationMinutes", "icon", "image", "name", "number", "priceMinorUnits", "slug"]);
    expect(service._id).toBeUndefined();
  });

  it("defaults unknown categories and icons for new services", () => {
    const [service] = normalizeServices([doc({ slug: "new-thing", category: "weird", icon: "nope" })], BOOKING_SERVICES);
    expect(service).toMatchObject({ category: "haircut", icon: "scissors" });
  });
});

describe("normalizePackages", () => {
  const pkgDoc = (overrides = {}) => ({ _id: "p", slug: "basic", name: "Basic", priceMinorUnits: 2500, note: "n", inclusions: ["Haircut"], featured: false, active: true, bookingServiceSlugs: ["haircut"], displayOrder: 1, ...overrides });

  it("falls back to the active file packages when the collection is empty", () => {
    expect(normalizePackages([], PRICING_PACKAGES).map((pkg) => [pkg.slug, pkg.priceMinorUnits])).toEqual([["basic", 2500], ["standard", 4000], ["premium", 6000]]);
  });

  it("uses valid database packages in order and drops invalid ones", () => {
    const packages = normalizePackages([
      pkgDoc({ slug: "gold", name: "Gold", priceMinorUnits: 9000, displayOrder: 2, featured: true }),
      pkgDoc({ slug: "basic", displayOrder: 1 }),
      pkgDoc({ slug: "free", priceMinorUnits: 0 }),
      pkgDoc({ slug: "off", active: false }),
    ], PRICING_PACKAGES);
    expect(packages.map((pkg) => pkg.slug)).toEqual(["basic", "gold"]);
    expect(packages[1].featured).toBe(true);
    expect(packages[0]._id).toBeUndefined();
  });

  it("limits and cleans inclusion lists", () => {
    const [pkg] = normalizePackages([pkgDoc({ inclusions: ["  A  ", "", 5, ...Array.from({ length: 20 }, (_, i) => `Item ${i}`)] })], PRICING_PACKAGES);
    expect(pkg.inclusions.length).toBeLessThanOrEqual(12);
    expect(pkg.inclusions[0]).toBe("A");
  });
});

describe("resolveCatalog", () => {
  it("returns the file data when loading fails and never throws", async () => {
    const services = await resolveCatalog({ fetchDocuments: async () => { throw new Error("db down"); }, normalize: normalizeServices, fileData: BOOKING_SERVICES });
    expect(services).toHaveLength(BOOKING_SERVICES.length);
  });

  it("returns database data when loading works", async () => {
    const services = await resolveCatalog({ fetchDocuments: async () => [doc({ name: "From DB" })], normalize: normalizeServices, fileData: BOOKING_SERVICES });
    expect(services[0].name).toBe("From DB");
  });
});

import { normalizePackages as normalizePackagesWithImages, normalizeServices as normalizeServicesWithImages } from "./normalize.js";
import { normalizePublicBarbers as normalizeBarbersWithImages } from "./barbers.js";

describe("pictures on the public catalog", () => {
  const url = "https://i.ibb.co/x/a.webp";
  const image = { mediaId: "secret-media-id", secureUrl: url, width: 640, height: 480, alt: "A fresh fade" };
  const fileService = [{ slug: "haircut", name: "Haircut", detail: "d", durationMinutes: 30, priceMinorUnits: 2500, icon: "scissors", category: "haircut" }];

  it("shows a record's picture without its media id, and null when it has none or an untrusted one", () => {
    const [withImage, without, untrusted] = normalizeServicesWithImages([
      { slug: "haircut", name: "Haircut", durationMinutes: 30, priceMinorUnits: 2500, displayOrder: 1, image },
      { slug: "beard", name: "Beard", durationMinutes: 20, priceMinorUnits: 1500, displayOrder: 2 },
      { slug: "shave", name: "Shave", durationMinutes: 20, priceMinorUnits: 1500, displayOrder: 3, image: { ...image, secureUrl: "https://evil.example/a.webp" } },
    ], fileService);
    expect(withImage.image).toEqual({ url, alt: "A fresh fade", width: 640, height: 480 });
    expect(JSON.stringify(withImage)).not.toContain("secret-media-id");
    expect(without.image).toBeNull();
    expect(untrusted.image).toBeNull();
  });

  it("does the same for packages and barbers", () => {
    const [pkg] = normalizePackagesWithImages([{ slug: "gold", name: "Gold", priceMinorUnits: 5000, displayOrder: 1, image }], []);
    expect(pkg.image.url).toBe(url);
    const [barber] = normalizeBarbersWithImages([{ slug: "alex", name: "Alex", active: true, publicProfile: true, image }], []);
    expect(barber.image).toEqual({ url, alt: "A fresh fade", width: 640, height: 480 });
    expect(JSON.stringify(barber)).not.toContain("secret-media-id");
  });
});
