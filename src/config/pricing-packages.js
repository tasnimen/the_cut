// Single source for the public pricing packages (display order = array order).
// Prices are USD minor units, before tax. Edit here or, later, from the admin dashboard.
export const PRICING_PACKAGES = Object.freeze([
  Object.freeze({
    slug: "basic", name: "Basic", priceMinorUnits: 2500, active: true, featured: false,
    note: "Essential care for your style.",
    inclusions: Object.freeze(["Haircut", "Quick Touch-up"]),
  }),
  Object.freeze({
    slug: "standard", name: "Standard", priceMinorUnits: 4000, active: true, featured: true,
    note: "Most popular choice.",
    inclusions: Object.freeze(["Haircut", "Beard Trim", "Wash & Style", "Product Finish"]),
  }),
  Object.freeze({
    slug: "premium", name: "Premium", priceMinorUnits: 6000, active: true, featured: false,
    note: "The full experience.",
    inclusions: Object.freeze(["Haircut", "Beard Trim", "Wash & Style", "Hot Towel Shave", "Product Finish"]),
  }),
]);
