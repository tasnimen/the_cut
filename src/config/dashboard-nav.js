import { DASHBOARD_AREAS } from "@/config/dashboard-access";
import { ROUTES } from "@/config/routes";

// Sidebar entries per dashboard area. Planned screens stay in the config with `enabled: false` and
// appear automatically once their page exists (a test checks that every enabled href has a page).
const item = (label, href, icon, enabled = false) => Object.freeze({ label, href, icon, enabled });

export const DASHBOARD_NAV = Object.freeze({
  user: Object.freeze([
    item("Overview", "/user", "dashboard", true),
    item("Appointments", "/user/appointments", "calendar"),
    item("Profile", "/user/profile", "users"),
    item("Security", "/user/security", "shield"),
  ]),
  admin: Object.freeze([
    item("Overview", "/admin", "dashboard", true),
    item("Bookings", "/admin/bookings", "calendar"),
    item("Customers", "/admin/customers", "users"),
    item("Services", "/admin/services", "scissors", true),
    item("Packages", "/admin/packages", "tag"),
    item("Barbers", "/admin/barbers", "razor"),
    item("Gallery", "/admin/gallery", "image"),
    item("Messages", "/admin/messages", "inbox"),
    item("Reports", "/admin/reports", "chart"),
    item("Settings", "/admin/settings", "settings"),
  ]),
  superAdmin: Object.freeze([
    item("Overview", "/super-admin", "dashboard", true),
    item("Admin dashboard", "/admin", "scissors", true),
    item("Admin accounts", "/super-admin/admins", "users"),
    item("Audit log", "/super-admin/audit", "shield"),
    item("Revenue", "/super-admin/revenue", "chart"),
    item("Security", "/super-admin/security", "settings"),
    item("Site images", "/super-admin/images", "image"),
  ]),
});

export const DASHBOARD_AREA_LABELS = Object.freeze({ user: "My account", admin: "Admin", superAdmin: "Super admin" });

export function visibleNav(areaKey, nav = DASHBOARD_NAV) {
  return (nav[areaKey] ?? []).filter((entry) => entry.enabled);
}

export function isNavItemActive(entry, pathname) {
  // Overview entries (the area root) match only exactly; deeper entries match their subtree.
  const isRoot = Object.values(DASHBOARD_AREAS).some((area) => area.path === entry.href);
  return isRoot ? pathname === entry.href : pathname === entry.href || pathname.startsWith(`${entry.href}/`);
}

// Home / Area / Current page (labels come from the nav config; unknown pages end at the area).
export function breadcrumbsFor(pathname, nav = DASHBOARD_NAV) {
  const areaKey = Object.keys(DASHBOARD_AREAS).find((key) => pathname === DASHBOARD_AREAS[key].path || pathname.startsWith(`${DASHBOARD_AREAS[key].path}/`));
  const crumbs = [{ label: "Home", href: ROUTES.home }];
  if (!areaKey) return crumbs;
  const area = DASHBOARD_AREAS[areaKey];
  crumbs.push({ label: DASHBOARD_AREA_LABELS[areaKey], href: area.path });
  const page = (nav[areaKey] ?? []).find((entry) => entry.href !== area.path && (pathname === entry.href || pathname.startsWith(`${entry.href}/`)));
  if (page) crumbs.push({ label: page.label, href: page.href });
  return crumbs;
}

export function greetingFor(date, timeZone) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(date)) % 24;
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}
