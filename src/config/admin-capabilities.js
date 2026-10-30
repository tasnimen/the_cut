// What a Super Admin can switch on or off for Admin users (pure data and pure decisions, no server APIs).
//
// A capability is "<group>.<action>". Each group has a "view" capability that opens its pages; every other
// capability of the group only works while "view" is on. SUPER_ADMIN is never restricted by any of this, and
// ADMIN can never be given anything outside this list (areas like permissions, audit or admin accounts stay
// Super Admin only). The defaults equal what an Admin could do before this system existed, so nothing
// changes until a Super Admin changes it.
//
// Enforcement is on the server: requirePrincipal(permission, { capability }) for actions and API routes, and
// requireDashboardAccess("admin", { capability }) for pages. A test checks that no admin entry point forgets it.

const cap = (id, label, description) => Object.freeze({ id, label, description });

export const ADMIN_CAPABILITY_GROUPS = Object.freeze([
  Object.freeze({
    key: "bookings", label: "Bookings", routes: Object.freeze(["/admin/bookings", "/admin/bookings/all", "/admin/bookings/walk-in"]),
    capabilities: Object.freeze([
      cap("bookings.view", "View bookings", "Today's bookings and the all-bookings list with search and filters."),
      cap("bookings.walkIn", "Create walk-in bookings", "The walk-in page and booking a customer who is in the shop."),
      cap("bookings.changeStatus", "Confirm, complete and mark no-show", "Status buttons other than Cancel."),
      cap("bookings.cancel", "Cancel bookings", "Cancel a customer's booking (the customer is emailed)."),
    ]),
  }),
  Object.freeze({
    key: "customers", label: "Customers", routes: Object.freeze(["/admin/customers"]),
    capabilities: Object.freeze([cap("customers.view", "View and search customers", "The read-only customers list (name, email, booking counts).")]),
  }),
  Object.freeze({
    key: "services", label: "Services", routes: Object.freeze(["/admin/services", "/admin/services/new", "/admin/services/[slug]"]),
    capabilities: Object.freeze([
      cap("services.view", "View services", "The services list."),
      cap("services.create", "Create services", "Add a service, including its picture."),
      cap("services.edit", "Edit and show or hide services", "Change details, price, picture, and turn a service on or off."),
    ]),
  }),
  Object.freeze({
    key: "packages", label: "Pricing packages", routes: Object.freeze(["/admin/packages", "/admin/packages/new", "/admin/packages/[slug]"]),
    capabilities: Object.freeze([
      cap("packages.view", "View packages", "The packages list."),
      cap("packages.create", "Create packages", "Add a package, including its picture."),
      cap("packages.edit", "Edit and show or hide packages", "Change details, price, picture, and turn a package on or off."),
    ]),
  }),
  Object.freeze({
    key: "barbers", label: "Barbers", routes: Object.freeze(["/admin/barbers", "/admin/barbers/new", "/admin/barbers/[slug]"]),
    capabilities: Object.freeze([
      cap("barbers.view", "View barbers", "The barbers list."),
      cap("barbers.create", "Create barbers", "Add a barber, including hours and picture."),
      cap("barbers.edit", "Edit and show or hide barbers", "Change hours, services, picture, and turn a barber on or off."),
    ]),
  }),
  Object.freeze({
    key: "gallery", label: "Gallery", routes: Object.freeze(["/admin/gallery"]),
    capabilities: Object.freeze([
      cap("gallery.view", "View the gallery manager", "The list of gallery photos."),
      cap("gallery.upload", "Upload photos", "Add photos to the public gallery."),
      cap("gallery.edit", "Edit photo details", "Change a photo's title, category and description."),
      cap("gallery.hide", "Hide and show photos", "Take a photo off the public gallery without deleting it."),
      cap("gallery.delete", "Delete photos", "Permanently delete a photo, including the stored file."),
    ]),
  }),
  Object.freeze({
    key: "messages", label: "Contact messages", routes: Object.freeze(["/admin/messages", "/admin/messages/[id]"]),
    capabilities: Object.freeze([
      cap("messages.view", "View and reply to messages", "Read messages and open the reply-by-email link."),
      cap("messages.markStatus", "Mark as read or replied", "Change a message's status."),
      cap("messages.delete", "Delete messages", "Permanently delete a message."),
    ]),
  }),
  Object.freeze({
    key: "reports", label: "Reports", routes: Object.freeze(["/admin/reports"]),
    capabilities: Object.freeze([cap("reports.view", "View operational reports", "Counts and rates for bookings, barbers and services (no money).")]),
  }),
  Object.freeze({
    key: "settings", label: "Business settings", routes: Object.freeze(["/admin/settings"]),
    capabilities: Object.freeze([
      cap("settings.view", "View business settings", "Opening hours, closed dates, contact and social links."),
      cap("settings.edit", "Edit business settings", "Save changes to those settings."),
    ]),
  }),
  Object.freeze({
    key: "siteImages", label: "Site images (API only)", routes: Object.freeze([]),
    capabilities: Object.freeze([cap("siteImages.manage", "Upload banner, slot and product images", "Generic image uploads for banners, slots and products (no screen yet).")]),
  }),
]);

export const ADMIN_CAPABILITIES = Object.freeze(ADMIN_CAPABILITY_GROUPS.flatMap((group) => group.capabilities.map((capability) => capability.id)));
const KNOWN = new Set(ADMIN_CAPABILITIES);
export const isKnownCapability = (id) => typeof id === "string" && KNOWN.has(id);
export const groupOf = (id) => String(id).split(".")[0];
const viewOf = (id) => `${groupOf(id)}.view`;

// Page capability by admin path. "/admin" itself (the dashboard overview) is always open to every Admin.
export const ADMIN_ROUTE_CAPABILITIES = Object.freeze({
  "/admin/bookings": "bookings.view",
  "/admin/bookings/all": "bookings.view",
  "/admin/bookings/walk-in": "bookings.walkIn",
  "/admin/customers": "customers.view",
  "/admin/services": "services.view",
  "/admin/services/new": "services.create",
  "/admin/services/[slug]": "services.edit",
  "/admin/packages": "packages.view",
  "/admin/packages/new": "packages.create",
  "/admin/packages/[slug]": "packages.edit",
  "/admin/barbers": "barbers.view",
  "/admin/barbers/new": "barbers.create",
  "/admin/barbers/[slug]": "barbers.edit",
  "/admin/gallery": "gallery.view",
  "/admin/messages": "messages.view",
  "/admin/messages/[id]": "messages.view",
  "/admin/reports": "reports.view",
  "/admin/settings": "settings.view",
});

// Everything on, which is what an Admin could do before the permission system existed.
export function defaultGrants() {
  return Object.fromEntries(ADMIN_CAPABILITIES.map((id) => [id, true]));
}

// Stored document -> a complete { capability: boolean } map. Unknown keys and non-boolean values are ignored
// (a missing capability keeps its default), so a stale or hand-edited document can never grant anything new.
export function resolveGrants(stored) {
  const grants = defaultGrants();
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return grants;
  for (const id of ADMIN_CAPABILITIES) if (typeof stored[id] === "boolean") grants[id] = stored[id];
  return grants;
}

// Is the capability (or any of several) effectively on? A non-view capability needs its group's "view" too.
// Unknown ids are never granted.
export function capabilityAllowed(grants, capability) {
  const ids = Array.isArray(capability) ? capability : [capability];
  return ids.some((id) => isKnownCapability(id) && grants[id] === true && (id === viewOf(id) || grants[viewOf(id)] === true));
}

// Super Admin input: exactly the known capabilities as booleans, nothing else. Returns the full map to store.
export function validateGrantsInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "invalid" };
  const unknown = Object.keys(input).filter((id) => !isKnownCapability(id));
  if (unknown.length > 0) return { ok: false, error: "unknown_capability" };
  if (Object.values(input).some((value) => typeof value !== "boolean")) return { ok: false, error: "not_boolean" };
  return { ok: true, grants: resolveGrants(input) };
}

// Which capability an admin media upload target needs (null: no admin capability, e.g. a user's own avatar).
export function capabilityForMediaTarget(target) {
  switch (target) {
    case "gallery": return "gallery.upload";
    case "services": return ["services.create", "services.edit"];
    case "packages": return ["packages.create", "packages.edit"];
    case "barbers": return ["barbers.create", "barbers.edit"];
    case "products": case "banners": case "slots": return "siteImages.manage";
    default: return null;
  }
}

// Which capability each picture kind needs for the pending-picture endpoint.
export const catalogImageCapability = (kind) => [`${kind}.create`, `${kind}.edit`];

// For the Super Admin screen: what an Admin can do right now, as sentences grouped by area.
export function describeEffectiveGrants(grants) {
  return ADMIN_CAPABILITY_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    allowed: group.capabilities.filter((capability) => capabilityAllowed(grants, capability.id)).map((capability) => capability.label),
    denied: group.capabilities.filter((capability) => !capabilityAllowed(grants, capability.id)).map((capability) => capability.label),
  }));
}
