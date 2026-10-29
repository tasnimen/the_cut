import { ROUTES } from "@/config/routes";

// Role rules for the private dashboard areas. Pure data + pure decisions so they can be tested
// without a server. The server guard (src/lib/auth/dashboard-guard.js) applies them.

export const DASHBOARD_AREAS = Object.freeze({
  user: Object.freeze({ key: "user", path: ROUTES.userDashboard, roles: Object.freeze(["USER", "ADMIN", "SUPER_ADMIN"]), requiresTwoFactor: false, guestsGoToSignIn: true }),
  admin: Object.freeze({ key: "admin", path: ROUTES.admin, roles: Object.freeze(["ADMIN", "SUPER_ADMIN"]), requiresTwoFactor: true, guestsGoToSignIn: false }),
  superAdmin: Object.freeze({ key: "superAdmin", path: ROUTES.superAdmin, roles: Object.freeze(["SUPER_ADMIN"]), requiresTwoFactor: true, guestsGoToSignIn: false }),
});

// The customer dashboard has real content since unit I-8, so signed-in customers land there.
export const USER_DASHBOARD_ENABLED = true;

export function landingPathFor(role) {
  if (role === "SUPER_ADMIN") return ROUTES.superAdmin;
  if (role === "ADMIN") return ROUTES.admin;
  if (role === "USER" && USER_DASHBOARD_ENABLED) return ROUTES.userDashboard;
  return ROUTES.home;
}

export function areaForPath(pathname) {
  return Object.values(DASHBOARD_AREAS).find((area) => pathname === area.path || pathname.startsWith(`${area.path}/`)) ?? null;
}

// session: null, or { user: { role, status, twoFactorEnabled }, versionCurrent: boolean }.
// Returns what the server should do. Unauthorized visitors get a 404 (the area is not revealed);
// only the customer area sends guests to sign in.
export function decideDashboardAccess(area, session) {
  const user = session?.user;
  if (!user || session.versionCurrent === false) return { action: area.guestsGoToSignIn ? "signIn" : "notFound" };
  if (user.status !== "ACTIVE" || !area.roles.includes(user.role)) return { action: "notFound" };
  if (area.requiresTwoFactor && !user.twoFactorEnabled) return { action: "twoFactor" };
  return { action: "allow" };
}

// Who may open the TOTP enrolment page (/two-factor): signed-in, active ADMIN or SUPER_ADMIN who has
// not enrolled yet. Customers get 404 (nothing to enrol here); enrolled admins go to their dashboard.
export function decideEnrolmentAccess(session) {
  const user = session?.user;
  if (!user || session.versionCurrent === false) return { action: "signIn" };
  if (user.status !== "ACTIVE" || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return { action: "notFound" };
  if (user.twoFactorEnabled) return { action: "done" };
  return { action: "allow" };
}
