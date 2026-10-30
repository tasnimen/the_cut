import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DASHBOARD_AREAS, decideDashboardAccess, decideEnrolmentAccess, landingPathFor } from "@/config/dashboard-access";
import { ROUTES } from "@/config/routes";
import { getAuth } from "@/lib/auth/server";
import { signInUrlFor } from "@/lib/auth/callback";
import { isSessionVersionCurrent } from "@/lib/auth/session-version";
import { roleHasCapability } from "@/lib/auth/capabilities";

// Call from EVERY dashboard page (and from the layout for the shell). A layout alone is not enough:
// Next.js does not re-render layouts when navigating between sibling pages. Server actions must
// additionally call requirePrincipal(permission) from lib/auth/authorization.js (it re-checks the
// session, status, permission and TOTP on every call).
// `capability` (optional) is the Super Admin controlled switch for this page; a revoked page is a 404 for an Admin,
// exactly like a page that does not exist. SUPER_ADMIN is never limited. Pass it on every admin page except the overview.
export async function requireDashboardAccess(areaKey, { capability } = {}) {
  const area = DASHBOARD_AREAS[areaKey];
  if (!area) notFound();

  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const normalized = session?.user
    ? {
        user: session.user,
        versionCurrent: isSessionVersionCurrent(session.session?.sessionVersion, session.user.sessionVersion),
      }
    : null;

  const decision = decideDashboardAccess(area, normalized);
  if (decision.action === "notFound") notFound();
  if (decision.action === "signIn") redirect(signInUrlFor(area.path));
  if (decision.action === "twoFactor") redirect(ROUTES.twoFactor);

  const { id, name, email, role } = session.user;
  if (capability && role === "ADMIN" && !(await roleHasCapability(role, capability))) notFound();
  return Object.freeze({ id, name: name || "", email: email || "", role });
}

// Guard for /two-factor (enrolment). Guests go to sign-in and come back; customers get 404;
// admins who are already enrolled go straight to their dashboard.
export async function requireEnrolmentAccess() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const normalized = session?.user
    ? { user: session.user, versionCurrent: isSessionVersionCurrent(session.session?.sessionVersion, session.user.sessionVersion) }
    : null;
  const decision = decideEnrolmentAccess(normalized);
  if (decision.action === "notFound") notFound();
  if (decision.action === "signIn") redirect(signInUrlFor(ROUTES.twoFactor));
  if (decision.action === "done") redirect(landingPathFor(session.user.role));
  const { name, email, role } = session.user;
  return Object.freeze({ name: name || "", email: email || "", role });
}
