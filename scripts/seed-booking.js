import { createConfiguredMongoClient, resolveConfiguredDatabaseName, selectConfiguredDatabase } from "../src/lib/db/mongo-config.js";
import { loadSeedEnvironment } from "../src/lib/booking/load-seed-environment.js";
import {
  applyBookingSeed,
  planBookingSeed,
  validateBookingSeedGuards,
  BookingSeedAmbiguityError,
  BookingSeedGuardError,
  BOOKING_SEED_OPT_IN_NAME,
} from "../src/lib/booking/seed-core.js";

loadSeedEnvironment(process.cwd());

const apply = process.argv.includes("--apply");
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--apply");
let client;
let writePhaseStarted = false;
const CONNECT_WATCHDOG_MS = 15_000;

function safeMongoFailure(error) {
  if (error?.code === 18 || error?.codeName === "AuthenticationFailed") return "MongoDB authentication failed.";
  if (["ENOTFOUND", "EAI_AGAIN", "ETIMEOUT", "SERVFAIL", "ESERVFAIL"].includes(error?.code)) {
    return `MongoDB DNS resolution failed (${error.code}).`;
  }
  if (error?.name === "MongoServerSelectionError") return "MongoDB server selection timed out or no server was reachable.";
  if (error?.name === "MongoParseError" || error?.name === "MongoInvalidArgumentError") {
    return "MongoDB connection configuration was rejected.";
  }
  if (["ECONNREFUSED", "ECONNRESET", "ECONNABORTED", "ETIMEDOUT"].includes(error?.code)) {
    return `MongoDB network connection failed (${error.code}).`;
  }
  return "MongoDB configuration or connection failed; details were suppressed to protect credentials.";
}

try {
  if (unknownArguments.length) throw new Error("Unsupported option. Omit flags for a read-only dry run; use --apply only for approved writes.");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");

  // Mirrors getMongo(): MONGODB_DB_NAME overrides the database encoded in the URI.
  const targetDatabaseName = await resolveConfiguredDatabaseName(uri, process.env.MONGODB_DB_NAME);
  validateBookingSeedGuards({
    nodeEnv: process.env.NODE_ENV,
    databaseName: targetDatabaseName,
    optIn: process.env.ALLOW_THE_CUT_BOOKING_SEED,
    apply,
  });

  console.log(`WARNING: seeding database ${targetDatabaseName}. Service changes affect the application using this data.`);
  console.log(`Verified target database: ${targetDatabaseName}`);
  console.log(apply ? "Mode: apply approved service/barber upserts." : "Mode: read-only dry run; no records will be changed.");

  client = createConfiguredMongoClient(uri, {
    connectTimeoutMS: 5_000,
    serverSelectionTimeoutMS: 8_000,
    socketTimeoutMS: 12_000,
    timeoutMS: 15_000,
  });
  const connectWatchdog = setTimeout(() => {
    process.stderr.write("Seed refused: MongoDB connection exceeded the 15-second DNS/server-selection deadline. Check DNS/network and Atlas network access. No database writes occurred.\n");
    process.exit(1);
  }, CONNECT_WATCHDOG_MS);
  try {
    await client.connect();
  } finally {
    clearTimeout(connectWatchdog);
  }
  const db = selectConfiguredDatabase(client, process.env.MONGODB_DB_NAME);
  if (db.databaseName !== targetDatabaseName) throw new Error("MongoDB target changed during preflight; refusing to continue.");

  const [existingServices, existingBarbers] = await Promise.all([
    db.collection("service").find({}, { projection: { _id: 1, slug: 1, name: 1, archivedAt: 1 } }).toArray(),
    db.collection("barber").find({}, { projection: { _id: 1, slug: 1, name: 1, archivedAt: 1, weeklySchedule: 1, breaks: 1, daysOff: 1 } }).toArray(),
  ]);
  const plan = planBookingSeed({ existingServices, existingBarbers });

  for (const { kind, service } of plan.services) console.log(`Service ${kind}: ${service.slug} — ${service.name}`);
  for (const { kind, barber } of plan.barbers) console.log(`Barber ${kind}: ${barber.slug} — ${barber.name}`);

  if (apply) {
    writePhaseStarted = true;
    await applyBookingSeed(db, plan);
    console.log("Approved service and barber upserts completed. Existing schedules and booking snapshots were preserved.");
  } else {
    console.log(`To authorize writes, set ${BOOKING_SEED_OPT_IN_NAME} to its documented opt-in value and rerun with --apply.`);
  }
} catch (error) {
  if (error instanceof BookingSeedAmbiguityError) {
    console.error(`Seed preflight stopped: ${error.message} No database writes were made.`);
  } else if (error instanceof BookingSeedGuardError) {
    console.error(`Seed refused: ${error.message}`);
  } else if (writePhaseStarted) {
    console.error("Seed stopped during targeted upserts. Some intended upserts may have completed; rerun a dry run before deciding whether to retry.");
  } else {
    console.error(`Seed refused: ${safeMongoFailure(error)} No credentials or connection details were printed.`);
  }
  process.exitCode = 1;
} finally {
  if (client) await client.close().catch(() => {});
}
