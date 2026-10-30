import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getMongo: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: mocks.getMongo }));
vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: mocks.audit }));

const { allGrants } = await import("@/config/admin-capabilities");
const { GRANTS_ID, loadAdminGrants, roleHasCapability, saveAdminGrants } = await import("./capabilities.js");

// A one-document store standing in for the adminPermission collection.
function store(initial = null) {
  const state = { doc: initial, updates: [] };
  const db = { collection: () => ({
    findOne: async (filter) => (filter._id === GRANTS_ID ? state.doc : null),
    updateOne: async (filter, update) => { state.updates.push(update); state.doc = { _id: GRANTS_ID, ...(state.doc ?? {}), ...update.$set, version: (state.doc?.version ?? 0) + 1 }; return { matchedCount: 1 }; },
  }) };
  return { db, state };
}

beforeEach(() => {
  mocks.getMongo.mockReset();
  mocks.audit.mockReset();
});

describe("roleHasCapability", () => {
  it("never limits a Super Admin, even when the database is down", async () => {
    mocks.getMongo.mockRejectedValue(new Error("db down"));
    expect(await roleHasCapability("SUPER_ADMIN", "messages.delete")).toBe(true);
    expect(await roleHasCapability("SUPER_ADMIN", "anything.at.all")).toBe(true);
    expect(mocks.getMongo).not.toHaveBeenCalled();
  });

  it("denies an Admin everything when nothing was ever saved (default deny)", async () => {
    mocks.getMongo.mockResolvedValue({ db: store(null).db });
    expect(await roleHasCapability("ADMIN", "messages.delete")).toBe(false);
    expect(await roleHasCapability("ADMIN", "gallery.upload")).toBe(false);
    expect(await roleHasCapability("ADMIN", "bookings.view")).toBe(false);
  });

  it("denies a revoked capability and applies a change on the very next check (no re-login)", async () => {
    const { db, state } = store({ _id: GRANTS_ID, grants: allGrants() });
    mocks.getMongo.mockResolvedValue({ db });
    expect(await roleHasCapability("ADMIN", "messages.delete")).toBe(true);
    state.doc = { _id: GRANTS_ID, grants: { ...allGrants(), "messages.delete": false } };
    expect(await roleHasCapability("ADMIN", "messages.delete")).toBe(false);
    expect(await roleHasCapability("ADMIN", "messages.markStatus")).toBe(true);
    state.doc = { _id: GRANTS_ID, grants: allGrants() };
    expect(await roleHasCapability("ADMIN", "messages.delete")).toBe(true);
  });

  it("denies the whole group when its view is off", async () => {
    mocks.getMongo.mockResolvedValue({ db: store({ _id: GRANTS_ID, grants: { ...allGrants(), "gallery.view": false } }).db });
    for (const id of ["gallery.upload", "gallery.delete", "gallery.hide"]) expect(await roleHasCapability("ADMIN", id)).toBe(false);
  });

  it("fails closed for an Admin when the grants cannot be read, and for unknown capabilities", async () => {
    mocks.getMongo.mockRejectedValue(new Error("db down"));
    expect(await roleHasCapability("ADMIN", "bookings.view")).toBe(false);
    mocks.getMongo.mockResolvedValue({ db: store(null).db });
    expect(await roleHasCapability("ADMIN", "made.up")).toBe(false);
    expect(await roleHasCapability("ADMIN", undefined)).toBe(false);
  });

  it("never grants anything to customers or guests", async () => {
    mocks.getMongo.mockResolvedValue({ db: store(null).db });
    for (const role of ["USER", "GUEST", undefined, "admin", ""]) expect(await roleHasCapability(role, "bookings.view")).toBe(false);
  });

  it("accepts an explicit database handle", async () => {
    const { db } = store({ _id: GRANTS_ID, grants: { ...allGrants(), "reports.view": false } });
    expect(await roleHasCapability("ADMIN", "reports.view", db)).toBe(false);
    expect(mocks.getMongo).not.toHaveBeenCalled();
    expect((await loadAdminGrants(db))["reports.view"]).toBe(false);
  });
});

describe("saveAdminGrants", () => {
  it("stores the full validated map, bumps the version and audits counts only", async () => {
    const { db, state } = store({ _id: GRANTS_ID, grants: allGrants() });
    const result = await saveAdminGrants(db, { ...allGrants(), "messages.delete": false, "gallery.hide": false }, "super-1", new Date("2026-10-30T12:00:00Z"));
    expect(result.ok).toBe(true);
    expect(result.changed.sort()).toEqual(["gallery.hide", "messages.delete"]);
    expect(state.doc.grants["messages.delete"]).toBe(false);
    expect(state.doc.grants["bookings.view"]).toBe(true);
    expect(state.doc.updatedBy).toBe("super-1");
    expect(state.updates[0].$inc).toEqual({ version: 1 });
    expect(mocks.audit.mock.calls[0][1]).toMatchObject({ actorId: "super-1", action: "permissions.admin_grants_updated", details: { changed: "2", granted: "0", revoked: "2" } });
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain("messages.delete");
  });

  it("counts grants as well as revocations", async () => {
    const { db } = store({ _id: GRANTS_ID, grants: { ...allGrants(), "messages.delete": false } });
    await saveAdminGrants(db, { ...allGrants(), "gallery.hide": false }, "super-1");
    expect(mocks.audit.mock.calls[0][1].details).toEqual({ changed: "2", granted: "1", revoked: "1" });
  });

  it("refuses unknown capabilities and non-booleans without writing or auditing", async () => {
    const { db, state } = store(null);
    expect((await saveAdminGrants(db, { "super.power": true }, "s")).ok).toBe(false);
    expect((await saveAdminGrants(db, { "messages.delete": "yes" }, "s")).ok).toBe(false);
    expect((await saveAdminGrants(db, null, "s")).ok).toBe(false);
    expect(state.updates).toHaveLength(0);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});

describe("effectiveCapabilities and loadAdminGrantsMeta", async () => {
  const { effectiveCapabilities, loadAdminGrantsMeta } = await import("./capabilities.js");
  const { ADMIN_CAPABILITIES } = await import("@/config/admin-capabilities");

  it("gives a Super Admin everything, a customer nothing, and an Admin what is switched on", async () => {
    const { db } = store({ _id: GRANTS_ID, grants: { ...allGrants(), "gallery.view": false, "messages.delete": false } });
    mocks.getMongo.mockResolvedValue({ db });
    const superAdmin = await effectiveCapabilities("SUPER_ADMIN");
    expect(Object.values(superAdmin).every(Boolean)).toBe(true);
    expect(Object.keys(superAdmin).sort()).toEqual([...ADMIN_CAPABILITIES].sort());
    const user = await effectiveCapabilities("USER");
    expect(Object.values(user).some(Boolean)).toBe(false);
    const admin = await effectiveCapabilities("ADMIN");
    expect(admin["gallery.view"]).toBe(false);
    expect(admin["gallery.delete"]).toBe(false); // the page is off, so its actions are off
    expect(admin["messages.delete"]).toBe(false);
    expect(admin["messages.markStatus"]).toBe(true);
    expect(admin["bookings.view"]).toBe(true);
  });

  it("gives an Admin nothing when the switches cannot be read", async () => {
    mocks.getMongo.mockRejectedValue(new Error("db down"));
    expect(Object.values(await effectiveCapabilities("ADMIN")).some(Boolean)).toBe(false);
  });

  it("reports when the switches were last saved", async () => {
    expect(await loadAdminGrantsMeta(store(null).db)).toEqual({ version: 0, updatedAt: null, updatedBy: null });
    const when = new Date("2026-10-30T12:00:00Z");
    expect(await loadAdminGrantsMeta(store({ _id: GRANTS_ID, version: 3, updatedAt: when, updatedBy: "super-1", grants: {} }).db)).toEqual({ version: 3, updatedAt: when.toISOString(), updatedBy: "super-1" });
  });
});
