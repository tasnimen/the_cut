import { isAllowedSeedDatabase } from "../booking/seed-core.js";

// Pure planning/validation for scripts/seed-admins.js. Nothing here prints or returns a password
// in an error message, and it never touches the network or the database.

export const ADMIN_SEED_OPT_IN_NAME = "ALLOW_ADMIN_SEED";
export const ADMIN_SEED_OPT_IN_VALUE = "YES_I_REVIEWED_THE_DEV_DATABASE";

export const ADMIN_SEED_ENV_NAMES = Object.freeze({
  SUPER_ADMIN: Object.freeze({ email: "SEED_SUPER_ADMIN_EMAIL", password: "SEED_SUPER_ADMIN_PASSWORD", name: "SEED_SUPER_ADMIN_NAME", defaultName: "Super Admin" }),
  ADMIN: Object.freeze({ email: "SEED_ADMIN_EMAIL", password: "SEED_ADMIN_PASSWORD", name: "SEED_ADMIN_NAME", defaultName: "Test Admin" }),
});

export class AdminSeedError extends Error {
  constructor(message) {
    super(message);
    this.name = "AdminSeedError";
  }
}

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function maskEmail(email) {
  const [local = "", domain = ""] = String(email).split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readAccount(env, role) {
  const names = ADMIN_SEED_ENV_NAMES[role];
  const email = clean(env[names.email]).toLowerCase();
  const password = typeof env[names.password] === "string" ? env[names.password] : "";
  const name = clean(env[names.name]) || names.defaultName;
  return { role, names, email, password, name };
}

// Returns the accounts to seed. SUPER_ADMIN is required; ADMIN is optional but must be complete if started.
export function readSeedAccounts(env) {
  const accounts = [];
  const problems = [];

  for (const role of ["SUPER_ADMIN", "ADMIN"]) {
    const account = readAccount(env, role);
    const started = Boolean(account.email || account.password);
    if (!started) {
      if (role === "SUPER_ADMIN") problems.push(`${account.names.email} and ${account.names.password} are required.`);
      continue;
    }
    if (!account.email) problems.push(`${account.names.email} is missing.`);
    else if (!EMAIL_PATTERN.test(account.email) || account.email.length > 320) problems.push(`${account.names.email} is not a valid email address.`);
    if (!account.password) problems.push(`${account.names.password} is missing.`);
    else {
      if (account.password.length < 10 || account.password.length > 128) problems.push(`${account.names.password} must be 10 to 128 characters.`);
      const local = account.email.split("@")[0];
      if (local && local.length >= 3 && account.password.toLowerCase().includes(local)) problems.push(`${account.names.password} must not contain the email name.`);
    }
    if (account.name.length > 100) problems.push(`${account.names.name} must be at most 100 characters.`);
    accounts.push({ role, email: account.email, password: account.password, name: account.name });
  }

  if (accounts.length === 2) {
    if (accounts[0].email === accounts[1].email) problems.push("The Super Admin and Admin emails must differ.");
    if (accounts[0].password === accounts[1].password) problems.push("The Super Admin and Admin passwords must be different (use a unique password for each).");
  }
  if (problems.length) throw new AdminSeedError(problems.join(" "));
  return accounts;
}

export function validateAdminSeedGuards({ nodeEnv, databaseName, optIn, apply }) {
  if (nodeEnv !== "development") throw new AdminSeedError("NODE_ENV must be development.");
  if (!isAllowedSeedDatabase(databaseName)) throw new AdminSeedError("Resolved MongoDB database must be the_cut or end with _dev or _test.");
  if (apply && optIn !== ADMIN_SEED_OPT_IN_VALUE) {
    throw new AdminSeedError(`Set ${ADMIN_SEED_OPT_IN_NAME} to its documented opt-in value before writes.`);
  }
  return Object.freeze({ databaseName, mode: apply ? "apply" : "dry-run" });
}

// existingByEmail: Map(email -> { role }). Never changes an existing password.
export function planAdminSeed({ accounts, existingByEmail, promoteExisting = false }) {
  return accounts.map((account) => {
    const existing = existingByEmail.get(account.email);
    if (!existing) return { kind: "create", account };
    if (existing.role === account.role) return { kind: "exists", account, existingRole: existing.role };
    if (!promoteExisting) return { kind: "conflict", account, existingRole: existing.role };
    return { kind: "promote", account, existingRole: existing.role };
  });
}
