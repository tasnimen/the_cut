import { describe, expect, it } from "vitest";
import { hasPermission } from "./policy.js";
import { bumpSessionVersionAfterPasswordChange, bumpSessionVersionForSecurityUpdate, isSessionVersionCurrent } from "./session-version.js";
import { PERMISSIONS, ROLES } from "../../config/permissions.js";

describe("server permission policy", () => {
  it("allows only capabilities explicitly present in the role matrix", () => {
    expect(hasPermission("USER", "bookingOwn")).toBe(true);
    expect(hasPermission("USER", "bookingsManageAll")).toBe(false);
    expect(hasPermission("GUEST", "publicRead")).toBe(true);
    expect(hasPermission("GUEST", "profileOwn")).toBe(false);
  });

  it("denies unknown roles and permission names by default", () => {
    expect(hasPermission("OWNER", "rolesManage")).toBe(false);
    expect(hasPermission("SUPER_ADMIN", "madeUpPermission")).toBe(false);
  });
});

describe.each(Object.entries(PERMISSIONS))("permission route matrix: %s", (permission, grants) => {
  it.each(Object.values(ROLES))("applies the configured grant for role %s", (role) => {
    expect(hasPermission(role, permission)).toBe(Object.hasOwn(grants, role));
  });
});

describe("session version revocation", () => {
  it("accepts only a session stamped with the current integer version", () => {
    expect(isSessionVersionCurrent(3, 3)).toBe(true);
    expect(isSessionVersionCurrent(2, 3)).toBe(false);
    expect(isSessionVersionCurrent(undefined, 0)).toBe(false);
    expect(isSessionVersionCurrent("3", 3)).toBe(false);
  });

  it("increments the version before a security-sensitive user field changes", async () => {
    const calls = [];
    const db = { collection: () => ({
      findOne: async () => ({ role: "USER" }),
      updateOne: async (...args) => { calls.push(args); return { matchedCount: 1 }; },
    }) };
    await expect(bumpSessionVersionForSecurityUpdate(db, { id: "user-1", role: "ADMIN" })).resolves.toBeUndefined();
    expect(calls).toEqual([[{ id: "user-1" }, { $inc: { sessionVersion: 1 } }]]);
    expect(isSessionVersionCurrent(0, 1)).toBe(false);
  });

  it("increments the version after a password change so stamped sessions become stale", async () => {
    let version = 4;
    const db = { collection: () => ({
      updateOne: async (filter, update) => {
        expect(filter).toEqual({ id: "user-1" });
        version += update.$inc.sessionVersion;
        return { matchedCount: 1 };
      },
    }) };

    await expect(bumpSessionVersionAfterPasswordChange(db, "user-1")).resolves.toBe(true);
    expect(isSessionVersionCurrent(4, version)).toBe(false);
    expect(isSessionVersionCurrent(5, version)).toBe(true);
  });

  it("does not increment versions for unchanged security fields or unrelated updates", async () => {
    const updates = [];
    const db = { collection: () => ({
      findOne: async () => ({ role: "USER" }),
      updateOne: async (...args) => { updates.push(args); return { matchedCount: 1 }; },
    }) };
    await bumpSessionVersionForSecurityUpdate(db, { id: "user-1", role: "USER" });
    await bumpSessionVersionForSecurityUpdate(db, { id: "user-1", name: "Barber" });
    expect(updates).toHaveLength(0);
  });
});
