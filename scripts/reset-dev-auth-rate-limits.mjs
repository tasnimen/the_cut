import nextEnv from "@next/env";
import { MongoClient } from "mongodb";

const confirmation = "--confirm-dev-reset";

if (process.env.NODE_ENV !== "development") {
  console.error("Refusing to run: set NODE_ENV=development explicitly.");
  process.exit(1);
}

if (process.argv.length !== 3 || process.argv[2] !== confirmation) {
  console.error(`Usage: node scripts/reset-dev-auth-rate-limits.mjs ${confirmation}`);
  process.exit(1);
}

nextEnv.loadEnvConfig(process.cwd(), true);

if (process.env.NODE_ENV !== "development") {
  console.error("Refusing to run: the loaded environment is not development.");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME;

if (!uri || !databaseName) {
  console.error("Refusing to run: MONGODB_URI and MONGODB_DB_NAME must be set.");
  process.exit(1);
}

let mongoUrl;
try {
  mongoUrl = new URL(uri);
} catch {
  console.error("Refusing to run: MongoDB URI is invalid.");
  process.exit(1);
}

if (!(["mongodb:", "mongodb+srv:"].includes(mongoUrl.protocol)
  && ["localhost", "127.0.0.1", "::1"].includes(mongoUrl.hostname))) {
  console.error("Refusing to run: this reset script only permits loopback MongoDB hosts.");
  process.exit(1);
}

const client = new MongoClient(uri, { appName: "the-cut-dev-rate-limit-reset" });

try {
  await client.connect();
  const result = await client.db(databaseName).collection("rateLimit").deleteMany({});
  console.log(`Deleted ${result.deletedCount} development auth rate-limit counter(s).`);
} catch {
  console.error("Could not reset development rate-limit counters; connection details were suppressed.");
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
