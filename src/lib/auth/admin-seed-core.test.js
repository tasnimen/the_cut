import { describe, expect, it } from "vitest";
import {
  ADMIN_SEED_OPT_IN_VALUE,
  AdminSeedError,
  maskEmail,
  planAdminSeed,
  readSeedAccounts,
  validateAdminSeedGuards,
} from "./admin-seed-core.js";

const good = {
  SEED_SUPER_ADMIN_EMAIL: "Owner@Example.com",
  SEED_SUPER_ADMIN_PASSWORD: "correct-horse-battery-1",
  SEED_ADMIN_EMAIL: "staff@example.com",
  SEED_ADMIN_PASSWORD: "another-long-secret-22",
};

function messageFor(env) {
  try { readSeedAccounts(env); } catch (error) { return error.message; }
  return "";
}

describe("readSeedAccounts", () => {
  it("reads both accounts, lowercases emails and applies default names", () => {
    const accounts = readSeedAccounts(good);
    expect(accounts.map((a) => [a.role, a.email, a.name])).toEqual([
      ["SUPER_ADMIN", "owner@example.com", "Super Admin"],
      ["ADMIN", "staff@example.com", "Test Admin"],
    ]);
  });

  it("makes the test admin optional but requires the super admin", () => {
    expect(readSeedAccounts({ SEED_SUPER_ADMIN_EMAIL: good.SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD: good.SEED_SUPER_ADMIN_PASSWORD })).toHaveLength(1);
    expect(messageFor({})).toMatch(/SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD are required/);
  });

  it("rejects weak, reused or incomplete credentials and never echoes a password", () => {
    expect(messageFor({ ...good, SEED_ADMIN_PASSWORD: "short" })).toMatch(/SEED_ADMIN_PASSWORD must be 10 to 128/);
    expect(messageFor({ ...good, SEED_ADMIN_PASSWORD: good.SEED_SUPER_ADMIN_PASSWORD })).toMatch(/passwords must be different/);
    expect(messageFor({ ...good, SEED_ADMIN_EMAIL: good.SEED_SUPER_ADMIN_EMAIL })).toMatch(/emails must differ/);
    expect(messageFor({ ...good, SEED_ADMIN_PASSWORD: "staff-staff-staff-1" })).toMatch(/must not contain the email name/);
    expect(messageFor({ SEED_SUPER_ADMIN_EMAIL: "not-an-email", SEED_SUPER_ADMIN_PASSWORD: good.SEED_SUPER_ADMIN_PASSWORD })).toMatch(/not a valid email/);
    expect(messageFor({ ...good, SEED_ADMIN_PASSWORD: "" })).toMatch(/SEED_ADMIN_PASSWORD is missing/);
    for (const env of [{ ...good, SEED_ADMIN_PASSWORD: "short" }, { ...good, SEED_ADMIN_EMAIL: good.SEED_SUPER_ADMIN_EMAIL }]) {
      const message = messageFor(env);
      expect(message).not.toContain(good.SEED_SUPER_ADMIN_PASSWORD);
      expect(message).not.toContain("short");
    }
  });
});

describe("validateAdminSeedGuards", () => {
  it("allows dry runs on the_cut and _dev/_test databases in development only", () => {
    for (const databaseName of ["the_cut", "selon_dev", "x_test"]) {
      expect(validateAdminSeedGuards({ nodeEnv: "development", databaseName, apply: false }).mode).toBe("dry-run");
    }
    expect(() => validateAdminSeedGuards({ nodeEnv: "production", databaseName: "the_cut", apply: false })).toThrow(AdminSeedError);
    expect(() => validateAdminSeedGuards({ nodeEnv: "development", databaseName: "prod", apply: false })).toThrow(/the_cut or end with/);
  });

  it("requires the opt-in value for writes", () => {
    expect(() => validateAdminSeedGuards({ nodeEnv: "development", databaseName: "the_cut", apply: true })).toThrow(/ALLOW_ADMIN_SEED/);
    expect(validateAdminSeedGuards({ nodeEnv: "development", databaseName: "the_cut", apply: true, optIn: ADMIN_SEED_OPT_IN_VALUE }).mode).toBe("apply");
  });
});

describe("planAdminSeed", () => {
  const accounts = readSeedAccounts(good);

  it("creates missing accounts and leaves matching ones alone", () => {
    const plan = planAdminSeed({ accounts, existingByEmail: new Map([["staff@example.com", { role: "ADMIN" }]]) });
    expect(plan.map((item) => item.kind)).toEqual(["create", "exists"]);
  });

  it("flags a role conflict and only promotes with the explicit option", () => {
    const existing = new Map([["owner@example.com", { role: "USER" }]]);
    expect(planAdminSeed({ accounts, existingByEmail: existing })[0].kind).toBe("conflict");
    expect(planAdminSeed({ accounts, existingByEmail: existing, promoteExisting: true })[0].kind).toBe("promote");
  });

  it("masks emails for output", () => {
    expect(maskEmail("owner@example.com")).toBe("o***@example.com");
  });
});
