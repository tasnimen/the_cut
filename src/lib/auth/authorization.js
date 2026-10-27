import "server-only";
import { headers } from "next/headers";
import { permissionScope, ROLES } from "@/config/permissions";
import { getAuth } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/policy";
import { getMongo } from "@/lib/db/mongo";
import { appendAuditEvent } from "@/lib/security/audit-log";
import { isSessionVersionCurrent } from "@/lib/auth/session-version";
import { getIP } from "@better-auth/core/utils/ip";
import { cookies } from "next/headers";
import { env, requireEnv } from "@/config/env";
import { isStepUpTokenValid, STEP_UP_COOKIE_NAME } from "@/lib/auth/security-events";

async function auditDenial(actorId, permission, requestHeaders) {
  const { db } = await getMongo();
  let ip = null;
  try {
    ip = getIP(requestHeaders, {});
  } catch {
    ip = null;
  }
  await appendAuditEvent(db, {
    actorId,
    action: "authorization.denied",
    targetType: "Permission",
    targetId: permission,
    outcome: "denied",
    ip,
    userAgent: requestHeaders.get("user-agent")?.slice(0, 512) || null,
  });
}

export class AuthorizationError extends Error {
  constructor(status = 403) {
    super(status === 401 ? "Authentication required" : "Permission denied");
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export async function requirePrincipal(permission) {
  const auth = await getAuth();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    await auditDenial(null, permission, requestHeaders);
    throw new AuthorizationError(401);
  }

  const { role, status, sessionVersion: currentUserVersion } = session.user;
  const sessionVersion = session.session.sessionVersion;
  if (!session.user.emailVerified || status !== "ACTIVE" || !Object.values(ROLES).includes(role) || !hasPermission(role, permission) || !isSessionVersionCurrent(sessionVersion, currentUserVersion)) {
    await auditDenial(session.user.id, permission, requestHeaders);
    throw new AuthorizationError(403);
  }
  if ([ROLES.admin, ROLES.superAdmin].includes(role) && !session.user.twoFactorEnabled) {
    await auditDenial(session.user.id, permission, requestHeaders);
    throw new AuthorizationError(403);
  }

  return Object.freeze({
    id: session.user.id,
    role,
    sessionId: session.session.id,
    sessionVersion,
    permissions: permissionScope(role, permission),
  });
}

export async function requireRecentStepUp(principal) {
  const cookieStore = await cookies();
  const cookieName = env.NODE_ENV === "production" ? `__Host-${STEP_UP_COOKIE_NAME}` : STEP_UP_COOKIE_NAME;
  const token = cookieStore.get(cookieName)?.value;
  if (!isStepUpTokenValid(token, principal, requireEnv("BETTER_AUTH_SECRET"))) {
    throw new AuthorizationError(403);
  }
  return principal;
}
