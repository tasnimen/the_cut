// Runs the booking reminder job once by hand (development). Calls the running app, so start `npm run dev` first.
//   node scripts/run-reminders.js [http://localhost:3000]
// Reads REMINDER_JOB_SECRET from the environment files (.env); the value is never printed.
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);
const secret = process.env.REMINDER_JOB_SECRET;
const base = process.argv[2] ?? process.env.SITE_URL ?? "http://localhost:3000";

if (!secret) {
  console.error("REMINDER_JOB_SECRET is not set in .env (see .env.example). Nothing was called.");
  process.exit(1);
}

try {
  const response = await fetch(new URL("/api/jobs/booking-reminders", base), { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
  const body = await response.json().catch(() => ({}));
  console.log(`Reminder job answered ${response.status}:`, JSON.stringify(body));
  process.exit(response.ok ? 0 : 1);
} catch (error) {
  console.error("Could not reach the app:", error?.message);
  process.exit(1);
}
