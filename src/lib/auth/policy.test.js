import { describe, expect, it } from "vitest";
import { hasPermission } from "./policy.js";
import { bumpSessionVersionForSecurityUpdate, isSessionVersionCurrent } from "./session-version.js";

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
