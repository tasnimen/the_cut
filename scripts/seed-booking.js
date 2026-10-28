import { loadEnvConfig } from "@next/env";
import { MongoClient } from "mongodb";

loadEnvConfig(process.cwd());

if (process.env.NODE_ENV !== "development" || !process.argv.includes("--confirm-dev-booking-seed")) {
  throw new Error("Seed blocked. Run only in development with --confirm-dev-booking-seed.");
}
if (!/(?:^|[-_])dev(?:elopment)?$/i.test(process.env.MONGODB_DB_NAME || "")) {
  throw new Error("Seed blocked. MONGODB_DB_NAME must end with '-dev', '_dev', '-development', or '_development'.");
}
if (!process.env.MONGODB_URI) throw new Error("Seed blocked. MONGODB_URI is not configured.");

const names = ["Daniel Carter", "James Miller", "Robert Wilson", "Michael Brown"];
const serviceDefinitions = [
  ["the-signature-cut", "The Signature Cut", 30],
  ["beard-trim", "Beard Trim", 30],
  ["the-hot-shave", "The Hot Shave", 30],
  ["hair-scalp", "Hair & Scalp", 45],
];
const schedule = {
  monday: { open: "09:00", close: "19:00" }, tuesday: { open: "09:00", close: "19:00" },
  wednesday: { open: "09:00", close: "19:00" }, thursday: { open: "09:00", close: "19:00" },
  friday: { open: "09:00", close: "19:00" }, saturday: { open: "09:00", close: "17:00" },
  sunday: { open: "10:00", close: "15:00" },
};
const now = new Date();
const client = new MongoClient(process.env.MONGODB_URI, { appName: "the-cut-dev-booking-seed", serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME);
  for (const [slug, name, durationMinutes] of serviceDefinitions) {
    await db.collection("service").updateOne({ slug }, { $setOnInsert: {
      slug, name, description: "", durationMinutes, priceMinorUnits: null, currency: "USD", active: true, createdAt: now, updatedAt: now,
    } }, { upsert: true });
  }
  for (const name of names) {
    const slug = name.toLowerCase().replaceAll(" ", "-");
    await db.collection("barber").updateOne({ slug }, { $setOnInsert: {
      slug, name, active: true, serviceSlugs: serviceDefinitions.map(([serviceSlug]) => serviceSlug),
      weeklySchedule: schedule, breaks: {}, daysOff: [], createdAt: now, updatedAt: now,
    } }, { upsert: true });
  }
  console.log("Development booking seed completed. Service prices remain unset until approved.");
} finally {
  await client.close();
}
