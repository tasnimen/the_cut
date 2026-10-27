import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { twoFactor } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { getIP } from "@better-auth/core/utils/ip";
import { env, requireEnv } from "@/config/env";
import { getSessionCookieOptions } from "@/lib/auth/cookies";
import { ensureSecurityIndexes, getMongo } from "@/lib/db/mongo";
import { appendAuditEvent } from "@/lib/security/audit-log";
import { bumpSessionVersionForSecurityUpdate } from "@/lib/auth/session-version";
import {
  createStepUpToken,
  hashAuthIdentifier,
  isFailedAuthResult,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_SECONDS,
} from "@/lib/auth/security-events";

let authPromise;

export async function getAuth() {
  if (!authPromise) {
    authPromise = (async () => {
      const { client, db } = await getMongo();
      await ensureSecurityIndexes(db);
      const baseURL = env.BETTER_AUTH_URL || env.SITE_URL || requireEnv("BETTER_AUTH_URL");
      return betterAuth({
        appName: "The Cut Barbershop",
        baseURL,
        secret: requireEnv("BETTER_AUTH_SECRET"),
        trustedOrigins: baseURL ? [baseURL] : [],
        database: mongodbAdapter(db, { client }),
        emailAndPassword: {
          enabled: true,
          requireEmailVerification: true,
        },
        user: {
          additionalFields: {
            role: { type: "string", required: true, defaultValue: "USER", input: false },
            status: { type: "string", required: true, defaultValue: "ACTIVE", input: false },
            sessionVersion: { type: "number", required: true, defaultValue: 0, input: false },
          },
        },
        session: {
          expiresIn: 60 * 60 * 24 * 7,
          updateAge: 60 * 60 * 24,
          cookieCache: { enabled: false },
          additionalFields: {
            sessionVersion: { type: "number", required: true, defaultValue: 0, input: false },
          },
        },
        advanced: {
          ...getSessionCookieOptions(env.NODE_ENV === "production"),
        },
        hooks: {
          after: createAuthMiddleware(async (ctx) => {
            if (isFailedAuthResult(ctx.path, ctx.context.returned)) {
              let actorId = ctx.context.session?.user?.id || null;
              const identifierHash = hashAuthIdentifier(ctx.body?.email, requireEnv("BETTER_AUTH_SECRET"));
              let ip = null;
              try {
                ip = ctx.request ? getIP(ctx.request, ctx.context.options) : null;
              } catch {
                ip = null;
              }
              await appendAuditEvent(db, {
                actorId,
                action: ctx.path === "/two-factor/verify-totp" ? "auth.two_factor.failed" : "auth.sign_in.failed",
                targetType: actorId ? "User" : "AuthIdentity",
                targetId: actorId || identifierHash,
                outcome: "failure",
                ip,
                userAgent: ctx.request?.headers.get("user-agent")?.slice(0, 512) || null,
              });
              if (ip) {
                const recentFailures = await db.collection("auditLog").countDocuments({
                  action: { $in: ["auth.sign_in.failed", "auth.two_factor.failed"] },
                  ip,
                  createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
                }, { limit: 6 });
                if (recentFailures >= 5 && recentFailures % 5 === 0) {
                  await appendAuditEvent(db, {
                    actorId: null,
                    action: "security.auth_failure.burst",
                    targetType: "AuthSource",
                    targetId: hashAuthIdentifier(ip, requireEnv("BETTER_AUTH_SECRET")),
                    outcome: "failure",
                    ip,
                    userAgent: ctx.request?.headers.get("user-agent")?.slice(0, 512) || null,
                  });
                }
              }
            }

            if (ctx.path === "/two-factor/verify-totp" && ctx.context.returned && !(ctx.context.returned.statusCode >= 400)) {
              const active = ctx.context.session || ctx.context.newSession;
              const userId = active?.user?.id;
              const sessionId = active?.session?.id;
              const token = createStepUpToken({
                userId,
                sessionId,
                expiresAt: Date.now() + STEP_UP_MAX_AGE_SECONDS * 1000,
              }, requireEnv("BETTER_AUTH_SECRET"));
              if (token) {
                const production = env.NODE_ENV === "production";
                ctx.setCookie(production ? `__Host-${STEP_UP_COOKIE_NAME}` : STEP_UP_COOKIE_NAME, token, {
                  httpOnly: true,
                  secure: production,
                  sameSite: "strict",
                  path: "/",
                  maxAge: STEP_UP_MAX_AGE_SECONDS,
                });
              }
            }
          }),
        },
        rateLimit: {
          enabled: true,
          storage: "database",
          window: 60,
          max: 100,
          customRules: {
            "/sign-in/*": { window: 60, max: 5 },
            "/sign-up/*": { window: 3600, max: 5 },
            "/request-password-reset": { window: 3600, max: 3 },
            "/reset-password*": { window: 3600, max: 5 },
            "/send-verification-email": { window: 3600, max: 3 },
            "/verify-email*": { window: 3600, max: 10 },
          },
        },
        databaseHooks: {
          user: {
            update: {
              before: async (update, context) => {
                const allowed = await bumpSessionVersionForSecurityUpdate(db, update, context);
                if (allowed === false) return false;
              },
            },
          },
          session: {
            create: {
              before: async (session) => {
                const user = await db.collection("user").findOne(
                  { id: session.userId },
                  { projection: { sessionVersion: 1 } },
                );
                return { data: { ...session, sessionVersion: Number(user?.sessionVersion ?? 0) } };
              },
              after: async (session, context) => {
                const user = await db.collection("user").findOne(
                  { id: session.userId },
                  { projection: { role: 1 } },
                );
                if (!["ADMIN", "SUPER_ADMIN"].includes(user?.role)) return;

                const request = context?.request;
                let ip = null;
                if (request) {
                  try {
                    ip = getIP(request, context?.context?.options || {});
                  } catch {
                    ip = null;
                  }
                }
                await appendAuditEvent(db, {
                  actorId: session.userId,
                  action: "auth.privileged_session.created",
                  targetType: "User",
                  targetId: session.userId,
                  outcome: "success",
                  ip,
                  userAgent: request?.headers.get("user-agent")?.slice(0, 512) || null,
                });
              },
            },
          },
        },
        plugins: [twoFactor({
          issuer: "The Cut Barbershop",
          twoFactorCookieMaxAge: 600,
          accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 900 },
        })],
      });
    })().catch((error) => {
      authPromise = undefined;
      throw error;
    });
  }
  return authPromise;
}
