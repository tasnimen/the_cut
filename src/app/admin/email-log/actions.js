"use server";

import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { getMongo } from "@/lib/db/mongo";
import { resendMail } from "@/lib/mail/booking-mail";
import { appendAuditEvent } from "@/lib/security/audit-log";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";
import { logServerError } from "@/lib/utils/log-error";

// Resend one failed email. Every export is a public endpoint: each call re-checks the session, role, TOTP, the
// permission and the Super Admin switch emailLog.resend, limits the rate, validates the id and audits the attempt.
// An email that was delivered cannot be sent again (the log key is unique); only a failed one is tried once more.

const RATE = { bucket: "admin-email-log", limit: 20, windowMs: 60_000 };
const DENIED = { status: "error", code: "denied", message: "You are not allowed to do that." };
const UNEXPECTED = { status: "error", code: "unexpected", message: "Something went wrong. Try again in a moment." };

export async function resendMailAction(id) {
  let principal;
  try {
    principal = await requirePrincipal("mailLogManageAll", { capability: "emailLog.resend" });
    const rate = await consumeUserRateLimit(principal.id, RATE);
    if (!rate.allowed) return { status: "error", code: "rate", message: "Too many attempts. Wait a moment and try again." };
  } catch (error) {
    if (error instanceof AuthorizationError) return DENIED;
    logServerError("email-log", error);
    return UNEXPECTED;
  }
  if (typeof id !== "string" || !/^[0-9a-f]{24}$/i.test(id)) return { status: "error", code: "not_found", message: "That email was not found." };

  try {
    const { db } = await getMongo();
    const result = await resendMail({ db, id });
    if (result.error === "not_found") return { status: "error", code: "not_found", message: "That email was not found." };
    if (result.error === "not_failed") return { status: "error", code: "not_failed", message: "Only an email that failed can be sent again." };
    await appendAuditEvent(db, { actorId: principal.id, action: "mail.resend_requested", targetType: "MailLog", targetId: id, outcome: result.ok ? "success" : "failure" });
    if (result.ok) return { status: "success", code: "sent", message: "Sent." };
    return { status: "error", code: result.status === "skipped" ? "skipped" : "failed", message: result.status === "skipped" ? "That email no longer applies (the booking changed), so it was not sent." : "It could not be sent again. Check the sender setup." };
  } catch (error) {
    logServerError("email-log", error);
    return UNEXPECTED;
  }
}
