import { ROUTES } from "@/config/routes";

export const siteNavigation = Object.freeze([
  Object.freeze(["Home", ROUTES.home]),
  Object.freeze(["About", ROUTES.about]),
  Object.freeze(["Services", ROUTES.services]),
  Object.freeze(["Gallery", ROUTES.gallery]),
  Object.freeze(["Pricing", ROUTES.pricing]),
  Object.freeze(["Contact", ROUTES.contact]),
]);

export const ROLE_LABELS = Object.freeze({ USER: "Customer", ADMIN: "Admin", SUPER_ADMIN: "Super Admin" });

const ALL_ACCOUNTS = Object.freeze(["USER", "ADMIN", "SUPER_ADMIN"]);

// Account dropdown entries. `enabled: false` marks planned routes that are not built yet;
// flip them to true when the page exists. Server checks stay the authority on every route.
export const accountMenu = Object.freeze([
  Object.freeze({ label: "Book Appointment", href: ROUTES.booking, roles: ALL_ACCOUNTS, enabled: true }),
  Object.freeze({ label: "My Dashboard", href: "/dashboard", roles: ALL_ACCOUNTS, enabled: false }),
  Object.freeze({ label: "My Appointments", href: "/dashboard/appointments", roles: ALL_ACCOUNTS, enabled: false }),
  Object.freeze({ label: "My Profile", href: "/dashboard/profile", roles: ALL_ACCOUNTS, enabled: false }),
  Object.freeze({ label: "Admin Dashboard", href: "/admin", roles: Object.freeze(["ADMIN", "SUPER_ADMIN"]), enabled: false }),
  Object.freeze({ label: "Super Admin", href: "/super-admin", roles: Object.freeze(["SUPER_ADMIN"]), enabled: false }),
]);

// After sign-out from one of these areas the user is sent home.
export const PROTECTED_PATH_PREFIXES = Object.freeze(["/dashboard", "/admin", "/super-admin"]);

export function getAccountMenuItems(role, menu = accountMenu) {
  return menu.filter((item) => item.enabled && item.roles.includes(role));
}

export function isProtectedPath(pathname) {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
