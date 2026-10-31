# Booking reminders

A reminder email goes to the customer about 24 hours before a confirmed booking. The worker is `src/lib/booking/reminders.js`; the job entry point is `POST` or `GET /api/jobs/booking-reminders` (added in Stage B, 2026-10-31). Something has to call it about once an hour; the app does not schedule itself.

## How the job is protected
| Item | Detail |
|---|---|
| Secret | `REMINDER_JOB_SECRET` in the environment (at least 32 random characters). Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| Off by default | No secret set means the route answers 404 and does nothing |
| Calling it | `Authorization: Bearer <secret>`; a missing or wrong value gets 401 (constant-time comparison) |
| Answer | `{ "ok": true, "sent": n, "failed": n }` only; no booking or customer data; `Cache-Control: no-store` |
| Safe to repeat | The worker claims each booking before sending and marks it sent, so overlapping or repeated calls do not send twice |
| Failures | A failed send is audited (`booking.reminder.delivery_failed`) and retried on the next call; a failed job logs one line without personal data |
| By hand (development) | `npm run run:reminders` (reads the secret from `.env`, never prints it; start `npm run dev` first) |

## Scheduling: two options (the host is not decided, so none is assumed)
| Option | How | Notes |
|---|---|---|
| A. External HTTP scheduler | Any service that can call a URL every hour with a header: a free GitHub Actions workflow with `schedule: cron: "7 * * * *"` and a step `curl -fsS -X POST -H "Authorization: Bearer $SECRET" https://YOUR-DOMAIN/api/jobs/booking-reminders` (secret stored as a repository secret), or a cron-job.org style service | Works on any host. Scheduled GitHub workflows can start several minutes late; the 23 to 25 hour window absorbs that |
| B. Host scheduler | Vercel Cron (`vercel.json` with `"crons": [{ "path": "/api/jobs/booking-reminders", "schedule": "7 * * * *" }]`; Vercel sends `Authorization: Bearer $CRON_SECRET`, so set `CRON_SECRET` to the same value as `REMINDER_JOB_SECRET`), or a server cron or Windows Task Scheduler task running the same `curl` | Check the plan: some free plans only allow daily jobs, and an hourly schedule would be refused or limited |

## Until the sender domain is verified
Reminders go through the same mail layer as every other booking mail. With the test sender, mail only reaches the account owner; customers receive nothing until the sender domain is verified (SPF, DKIM, DMARC) and `MAIL_FROM` is changed. Failures are audited and do not affect the booking.
