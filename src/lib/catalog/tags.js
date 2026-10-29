// Cache tags for the public catalog. Admin actions (units I-15 onward) call revalidateCatalog() with these.
export const CATALOG_TAGS = Object.freeze({
  services: "catalog:services",
  packages: "catalog:packages",
  barbers: "catalog:barbers",
  settings: "catalog:settings",
  gallery: "catalog:gallery",
  slots: "catalog:slots",
});

export const CATALOG_REVALIDATE_SECONDS = 300;
