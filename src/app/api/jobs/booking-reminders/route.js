import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { runDueBookingReminders } from "@/lib/booking/reminders";
import { getMongo } from "@/lib/db/mongo";
import { retryDueMail, sendReminderMail } from "@/lib/mail/booking-mail";
import { logServerError } from "@/lib/utils/log-error";

// Reminder job: a scheduler (hourly) calls this with `Authorization: Bearer <REMINDER_JOB_SECRET>`; it sends the
// reminders that are due. Not for browsers: it has no session, so the shared secret is the only way in. Without a
// configured secret the job is switched off (404). The worker claims each booking before sending, so two calls at
// once, or a retry, never send the same reminder twice. Responses never contain booking or customer data.
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

function allowed(request) {
  const secret = env.REMINDER_JOB_SECRET;
  if (!secret) return null;
  const given = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request) {
  const decision = allowed(request);
  if (decision === null) return NextResponse.json({ error: "not_found" }, { status: 404, headers: HEADERS });
  if (!decision) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { ...HEADERS, "WWW-Authenticate": "Bearer" } });
  try {
    const { db } = await getMongo();
    const result = await runDueBookingReminders({ db, sendReminder: (message) => sendReminderMail({ db, ...message }) });
    // Then give the emails that failed earlier their next attempt (backoff 5 minutes, 30 minutes, 2 hours; four attempts).
    const retried = await retryDueMail({ db });
    return NextResponse.json({ ok: true, sent: result.sent, failed: result.failed, retried }, { headers: HEADERS });
  } catch (error) {
    logServerError("booking-reminders", error);
    return NextResponse.json({ error: "job_failed" }, { status: 500, headers: HEADERS });
  }
}

// Some schedulers can only send GET; both do the same work.
export const GET = run;
export const POST = run;
