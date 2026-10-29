import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { createConfiguredMongoClient, resolveConfiguredDatabaseName, selectConfiguredDatabase } from "../src/lib/db/mongo-config.js";
import { loadSeedEnvironment } from "../src/lib/booking/load-seed-environment.js";
import {
  ADMIN_SEED_ENV_NAMES,
  ADMIN_SEED_OPT_IN_NAME,
  AdminSeedError,
  maskEmail,
  planAdminSeed,
  readSeedAccounts,
  validateAdminSeedGuards,
} from "../src/lib/auth/admin-seed-core.js";

// Creates the first SUPER_ADMIN and (optionally) a test ADMIN. Development database only.
// Passwords are read from the environment, never printed, logged, or written anywhere but the hashed account record.

loadSeedEnvironment(process.cwd());

const KNOWN_FLAGS = new Set(["--apply", "--promote-existing"]);
const apply = process.argv.includes("--apply");
const promoteExisting = process.argv.includes("--promote-existing");
const unknownArguments = process.argv.slice(2).filter((argument) => !KNOWN_FLAGS.has(argument));
let client;
let writePhaseStarted = false;
const CONNECT_WATCHDOG_MS = 15_000;

function safeMongoFailure(error) {
  if (error?.code === 18 || error?.codeName === "AuthenticationFailed") return "MongoDB authentication failed.";
  if (["ENOTFOUND", "EAI_AGAIN", "ETIMEOUT", "SERVFAIL", "ESERVFAIL"].includes(error?.code)) return `MongoDB DNS resolution failed (${error.code}).`;
  if (error?.name === "MongoServerSelectionError") return "MongoDB server selection timed out or no server was reachable.";
  return "MongoDB configuration or connection failed; details were suppressed to protect credentials.";
}

async function audit(db, action, userId, role) {
  await db.collection("auditLog").insertOne({
    actorId: null,
    action,
    targetType: "User",
    targetId: userId,
    outcome: "success",
    details: { role, source: "seed-admins-script" },
    createdAt: new Date(),
  });
}

async function createAccount(db, auth, account) {
  await auth.api.signUpEmail({ body: { name: account.name, email: account.email, password: account.password } });
  const user = await db.collection("user").findOne({ email: account.email }, { projection: { _id: 1 } });
  if (!user) throw new Error("Account creation did not persist.");
  const userId = String(user._id);
  await db.collection("user").updateOne(
    { _id: user._id },
    { $set: { role: account.role, status: "ACTIVE", sessionVersion: 0, twoFactorEnabled: false, emailVerified: true, updatedAt: new Date() } },
  );
  // Sign-up opens a session; the seeded account must sign in itself.
  await db.collection("session").deleteMany({ userId });
  await audit(db, "seed.account.created", userId, account.role);
}

try {
  if (unknownArguments.length) throw new AdminSeedError("Unsupported option. Omit flags for a read-only dry run; use --apply (and optionally --promote-existing) for writes.");
  const accounts = readSeedAccounts(process.env);
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new AdminSeedError("MONGODB_URI is not configured.");
  const secret = process.env.BETTER_AUTH_SECRET;
  if (apply && (!secret || secret.length < 32)) throw new AdminSeedError("BETTER_AUTH_SECRET must be configured (32+ characters).");

  const targetDatabaseName = await resolveConfiguredDatabaseName(uri, process.env.MONGODB_DB_NAME);
  validateAdminSeedGuards({ nodeEnv: process.env.NODE_ENV, databaseName: targetDatabaseName, optIn: process.env[ADMIN_SEED_OPT_IN_NAME], apply });
  console.log(`Verified target database: ${targetDatabaseName}`);
  console.log(apply ? "Mode: apply (creates accounts)." : "Mode: read-only dry run; nothing will be changed.");

  client = createConfiguredMongoClient(uri, { connectTimeoutMS: 5_000, serverSelectionTimeoutMS: 8_000, socketTimeoutMS: 12_000, timeoutMS: 15_000 });
  const watchdog = setTimeout(() => {
    process.stderr.write("Seed refused: MongoDB connection exceeded the 15-second deadline. No database writes were made.\n");
    process.exit(1);
  }, CONNECT_WATCHDOG_MS);
  try { await client.connect(); } finally { clearTimeout(watchdog); }

  const db = selectConfiguredDatabase(client, process.env.MONGODB_DB_NAME);
  if (db.databaseName !== targetDatabaseName) throw new Error("MongoDB target changed during preflight; refusing to continue.");

  const existing = await db.collection("user").find({ email: { $in: accounts.map((account) => account.email) } }, { projection: { email: 1, role: 1 } }).toArray();
  const plan = planAdminSeed({ accounts, existingByEmail: new Map(existing.map((user) => [user.email, { role: user.role }])), promoteExisting });

  for (const item of plan) {
    const label = `${item.account.role} ${maskEmail(item.account.email)}`;
    if (item.kind === "create") console.log(`Create: ${label}`);
    else if (item.kind === "exists") console.log(`Already exists with this role (unchanged): ${label}`);
    else if (item.kind === "promote") console.log(`Promote existing ${item.existingRole} account to ${item.account.role}: ${label} (password untouched)`);
    else console.log(`Conflict: ${maskEmail(item.account.email)} already exists as ${item.existingRole}. Rerun with --promote-existing to change its role (password untouched).`);
  }

  if (!apply) {
    console.log(`To write, set ${ADMIN_SEED_OPT_IN_NAME} to its documented opt-in value and rerun with --apply.`);
  } else if (plan.some((item) => item.kind === "conflict")) {
    throw new AdminSeedError("Conflicting existing accounts found; nothing was written.");
  } else {
    writePhaseStarted = true;
    const auth = betterAuth({
      appName: "The Cut seed",
      baseURL: process.env.BETTER_AUTH_URL || process.env.SITE_URL || "http://localhost:3000",
      secret,
      database: mongodbAdapter(db, { client }),
      emailAndPassword: { enabled: true, requireEmailVerification: false },
      user: {
        additionalFields: {
          role: { type: "string", required: true, defaultValue: "USER", input: false },
          status: { type: "string", required: true, defaultValue: "ACTIVE", input: false },
          sessionVersion: { type: "number", required: true, defaultValue: 0, input: false },
        },
      },
      rateLimit: { enabled: false },
    });
    for (const item of plan) {
      if (item.kind === "create") await createAccount(db, auth, item.account);
      if (item.kind === "promote") {
        const user = await db.collection("user").findOne({ email: item.account.email }, { projection: { _id: 1 } });
        await db.collection("user").updateOne({ _id: user._id }, { $set: { role: item.account.role, status: "ACTIVE", updatedAt: new Date() }, $inc: { sessionVersion: 1 } });
        await audit(db, "seed.account.promoted", String(user._id), item.account.role);
      }
    }
    console.log("Done. Admin and Super Admin accounts must enrol an authenticator app (TOTP) on first sign-in before privileged pages open.");
  }
} catch (error) {
  if (error instanceof AdminSeedError) console.error(`Seed refused: ${error.message}`);
  else if (writePhaseStarted) console.error("Seed stopped during writes. Some accounts may have been created; rerun a dry run to see the current state.");
  else console.error(`Seed refused: ${safeMongoFailure(error)} No credentials or connection details were printed.`);
  process.exitCode = 1;
} finally {
  if (client) await client.close().catch(() => {});
}

// Documented variable names (values are never read into output):
void ADMIN_SEED_ENV_NAMES;
