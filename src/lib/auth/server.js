import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { twoFactor } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { getIP } from "@better-auth/core/utils/ip";
import { after } from "next/server";
import { env, requireEnv } from "@/config/env";
import { userIdFilter } from "@/lib/db/user-filter";
import { emailVerificationAuthOptions } from "@/lib/auth/verification-policy";
import { getSessionCookieOptions } from "@/lib/auth/cookies";
import { ensureSecurityIndexes, getMongo } from "@/lib/db/mongo";
import { appendAuditEvent } from "@/lib/security/audit-log";
import { bumpSessionVersionAfterPasswordChange, bumpSessionVersionForSecurityUpdate } from "@/lib/auth/session-version";
import { AUTH_RATE_LIMIT_POLICY } from "@/lib/auth/request-security";
import { getAuthFailureWindowStart, queueAuthFailureAlert } from "@/lib/auth/failure-bursts";
import { registerEmailVerificationToken } from "@/lib/auth/email-verification-tokens";
import { resolveAuthBaseUrl } from "@/lib/auth/base-url";
import { sendFailedAuthAlert, sendPasswordResetEmail, sendVerificationEmail } from "@/lib/mail/mailer";
import { scheduleMailDelivery } from "@/lib/mail/mailer-core";
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
      const baseURL = resolveAuthBaseUrl(env);
      const verificationOptions = emailVerificationAuthOptions(env.AUTH_REQUIRE_EMAIL_VERIFICATION);
      return betterAuth({
        appName: "The Cut Barbershop",
        baseURL,
        secret: requireEnv("BETTER_AUTH_SECRET"),
        trustedOrigins: baseURL ? [baseURL] : [],
        database: mongodbAdapter(db, { client }),
        emailAndPassword: {
          ...verificationOptions.emailAndPassword,
          resetPasswordTokenExpiresIn: 60 * 60,
          revokeSessionsOnPasswordReset: true,
          // Always answers the same way whether or not the address has an account; mail is sent in the background.
          sendResetPassword: async ({ user, url }) => {
            scheduleMailDelivery({
              schedule: after,
              send: () => sendPasswordResetEmail({ to: user.email, name: user.name, url }),
              onFailure: () => appendAuditEvent(db, {
                actorId: null,
                action: "auth.password_reset.delivery_failed",
                targetType: "AuthIdentity",
                targetId: hashAuthIdentifier(user.email, requireEnv("BETTER_AUTH_SECRET")),
                outcome: "failure",
              }),
            });
          },
          onPasswordReset: async ({ user }) => {
            await bumpSessionVersionAfterPasswordChange(db, user.id);
            await appendAuditEvent(db, { actorId: user.id, action: "auth.password_reset.completed", targetType: "User", targetId: user.id, outcome: "success" });
          },
        },
        emailVerification: {
          ...verificationOptions.emailVerification,
          expiresIn: 60 * 60,
          autoSignInAfterVerification: false,
          sendVerificationEmail: async ({ user, url, token }) => {
            await registerEmailVerificationToken(db, token, requireEnv("BETTER_AUTH_SECRET"));
            scheduleMailDelivery({
              schedule: after,
              send: () => sendVerificationEmail({ to: user.email, name: user.name, url }),
              onFailure: () => appendAuditEvent(db, {
                actorId: null,
                action: "auth.email_verification.delivery_failed",
                targetType: "AuthIdentity",
                targetId: hashAuthIdentifier(user.email, requireEnv("BETTER_AUTH_SECRET")),
                outcome: "failure",
              }),
            });
          },
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
            if (ctx.path === "/change-password" && ctx.context.returned && !(ctx.context.returned.statusCode >= 400)) {
              const userId = ctx.context.session?.user?.id;
              if (userId) await bumpSessionVersionAfterPasswordChange(db, userId);
            }

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
                const now = new Date();
                const recentFailures = await db.collection("auditLog").countDocuments({
                  action: { $in: ["auth.sign_in.failed", "auth.two_factor.failed"] },
                  ip,
                  createdAt: { $gte: getAuthFailureWindowStart(now), $lte: now },
                }, { limit: 6 });
                if (recentFailures >= 5) {
                  const alert = {
                    ip,
                    userAgent: ctx.request?.headers.get("user-agent")?.slice(0, 512) || null,
                    occurredAt: new Date(),
                  };
                  await queueAuthFailureAlert({
                    count: recentFailures,
                    schedule: after,
                    recordBurst: () => appendAuditEvent(db, {
                      actorId: null,
                      action: "security.auth_failure.burst",
                      targetType: "AuthSource",
                      targetId: hashAuthIdentifier(ip, requireEnv("BETTER_AUTH_SECRET")),
                      outcome: "failure",
                      ip,
                      userAgent: alert.userAgent,
                    }),
                    send: () => sendFailedAuthAlert(alert),
                    onDeliveryFailure: () => appendAuditEvent(db, {
                      actorId: null,
                      action: "security.auth_failure.alert_delivery_failed",
                      targetType: "AuthSource",
                      targetId: hashAuthIdentifier(ip, requireEnv("BETTER_AUTH_SECRET")),
                      outcome: "failure",
                      ip,
                      userAgent: alert.userAgent,
                    }),
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
        rateLimit: AUTH_RATE_LIMIT_POLICY,
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
                  userIdFilter(session.userId),
                  { projection: { sessionVersion: 1 } },
                );
                return { data: { ...session, sessionVersion: Number(user?.sessionVersion ?? 0) } };
              },
              after: async (session, context) => {
                const user = await db.collection("user").findOne(
                  userIdFilter(session.userId),
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
