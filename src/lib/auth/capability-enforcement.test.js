import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), grantsDoc: { current: null }, audit: vi.fn(), notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }), redirect: vi.fn((to) => { throw new Error(`REDIRECT:${to}`); }) }));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "test" }), cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock("@/lib/auth/server", () => ({ getAuth: async () => ({ api: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: { collection: () => ({ findOne: async () => mocks.grantsDoc.current }) } }) }));
vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: mocks.audit }));

const { allGrants, capabilityForMediaTarget } = await import("@/config/admin-capabilities");
const { AuthorizationError, requirePrincipal } = await import("./authorization.js");
const { requireDashboardAccess } = await import("./dashboard-guard.js");

const sessionFor = (role, overrides = {}) => ({
  user: { id: "u1", role, status: "ACTIVE", sessionVersion: 0, twoFactorEnabled: true, emailVerified: true, name: "N", email: "n@example.com", ...overrides },
  session: { id: "s1", sessionVersion: 0 },
});
const revoke = (...ids) => { mocks.grantsDoc.current = { _id: "admin-grants", grants: { ...allGrants(), ...Object.fromEntries(ids.map((id) => [id, false])) } }; };

beforeEach(() => {
  mocks.getSession.mockReset();
  mocks.audit.mockReset();
  mocks.notFound.mockClear();
  mocks.redirect.mockClear();
  mocks.grantsDoc.current = { _id: "admin-grants", grants: allGrants() }; // everything saved on; each test revokes what it checks
});

describe("requirePrincipal with a capability", () => {
  it("lets an Admin through while the capability is on, and refuses once the Super Admin switches it off", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN"));
    await expect(requirePrincipal("contactDeleteAll", { capability: "messages.delete" })).resolves.toMatchObject({ id: "u1", role: "ADMIN" });
    revoke("messages.delete");
    await expect(requirePrincipal("contactDeleteAll", { capability: "messages.delete" })).rejects.toMatchObject({ name: "AuthorizationError", status: 403 });
    expect(mocks.audit.mock.calls.at(-1)[1]).toMatchObject({ action: "authorization.denied", outcome: "denied", actorId: "u1" });
    // Other actions in the same area keep working.
    await expect(requirePrincipal("contactManageAll", { capability: "messages.markStatus" })).resolves.toBeTruthy();
  });

  it("never limits a Super Admin", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("SUPER_ADMIN"));
    revoke("messages.delete", "messages.view", "gallery.view", "gallery.upload");
    await expect(requirePrincipal("contactDeleteAll", { capability: "messages.delete" })).resolves.toMatchObject({ role: "SUPER_ADMIN" });
    await expect(requirePrincipal("mediaGalleryManageAll", { capability: "gallery.upload" })).resolves.toBeTruthy();
  });

  it("still refuses customers and guests before any capability is looked at", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("USER"));
    await expect(requirePrincipal("contactDeleteAll", { capability: "messages.delete" })).rejects.toBeInstanceOf(AuthorizationError);
    mocks.getSession.mockResolvedValue(null);
    await expect(requirePrincipal("contactDeleteAll", { capability: "messages.delete" })).rejects.toMatchObject({ status: 401 });
  });

  it("leaves sign-in rules alone: an Admin without TOTP is still refused, and a suspended Admin too", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN", { twoFactorEnabled: false }));
    await expect(requirePrincipal("contactManageAll", { capability: "messages.view" })).rejects.toMatchObject({ status: 403 });
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN", { status: "SUSPENDED" }));
    await expect(requirePrincipal("contactManageAll", { capability: "messages.view" })).rejects.toMatchObject({ status: 403 });
  });

  it("treats any-of lists correctly and denies unknown ids", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN"));
    revoke("services.create");
    await expect(requirePrincipal("servicesManageAll", { capability: ["services.create", "services.edit"] })).resolves.toBeTruthy();
    revoke("services.create", "services.edit");
    await expect(requirePrincipal("servicesManageAll", { capability: ["services.create", "services.edit"] })).rejects.toMatchObject({ status: 403 });
    await expect(requirePrincipal("servicesManageAll", { capability: "typo.view" })).rejects.toMatchObject({ status: 403 });
  });

  it("does not add a check when no capability is passed (existing own-data permissions keep working)", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN"));
    revoke("bookings.view", "messages.view");
    await expect(requirePrincipal("bookingOwn")).resolves.toBeTruthy();
  });
});

describe("requireDashboardAccess with a capability", () => {
  it("shows a revoked page to an Admin as a 404, and a granted one normally", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN"));
    await expect(requireDashboardAccess("admin", { capability: "reports.view" })).resolves.toMatchObject({ role: "ADMIN" });
    revoke("reports.view");
    await expect(requireDashboardAccess("admin", { capability: "reports.view" })).rejects.toThrow("NOT_FOUND");
    await expect(requireDashboardAccess("admin", { capability: "customers.view" })).resolves.toBeTruthy();
    await expect(requireDashboardAccess("admin")).resolves.toBeTruthy(); // the overview is always open
  });

  it("never limits a Super Admin and leaves the other rules unchanged", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("SUPER_ADMIN"));
    revoke("reports.view");
    await expect(requireDashboardAccess("admin", { capability: "reports.view" })).resolves.toMatchObject({ role: "SUPER_ADMIN" });
    mocks.getSession.mockResolvedValue(sessionFor("USER"));
    await expect(requireDashboardAccess("admin", { capability: "reports.view" })).rejects.toThrow("NOT_FOUND");
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN", { twoFactorEnabled: false }));
    await expect(requireDashboardAccess("admin", { capability: "reports.view" })).rejects.toThrow(/REDIRECT/);
    mocks.getSession.mockResolvedValue(null);
    await expect(requireDashboardAccess("admin", { capability: "reports.view" })).rejects.toThrow("NOT_FOUND");
  });

  it("an Admin can never open Super Admin pages whatever the grants say", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN"));
    mocks.grantsDoc.current = { _id: "admin-grants", grants: {} };
    await expect(requireDashboardAccess("superAdmin")).rejects.toThrow("NOT_FOUND");
  });

  it("default deny: with nothing saved the Admin keeps only the dashboard overview", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN"));
    mocks.grantsDoc.current = null;
    await expect(requireDashboardAccess("admin")).resolves.toMatchObject({ role: "ADMIN" });
    for (const capability of ["bookings.view", "services.view", "settings.view"]) await expect(requireDashboardAccess("admin", { capability })).rejects.toThrow("NOT_FOUND");
    await expect(requirePrincipal("servicesManageAll", { capability: "services.edit" })).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("site images: an Admin can upload banner, slot and product images only while the switch is on (default deny otherwise)", async () => {
    mocks.getSession.mockResolvedValue(sessionFor("ADMIN"));
    for (const target of ["banners", "slots", "products"]) {
      const permission = { banners: "mediaBannersManageAll", slots: "mediaSlotsManageAll", products: "mediaProductsManageAll" }[target];
      revoke("siteImages.manage");
      await expect(requirePrincipal(permission, { capability: capabilityForMediaTarget(target) })).rejects.toBeInstanceOf(AuthorizationError);
      mocks.grantsDoc.current = { _id: "admin-grants", grants: allGrants() };
      await expect(requirePrincipal(permission, { capability: capabilityForMediaTarget(target) })).resolves.toMatchObject({ role: "ADMIN" });
      mocks.grantsDoc.current = null;
      await expect(requirePrincipal(permission, { capability: capabilityForMediaTarget(target) })).rejects.toBeInstanceOf(AuthorizationError);
    }
    mocks.getSession.mockResolvedValue(sessionFor("SUPER_ADMIN"));
    mocks.grantsDoc.current = null;
    await expect(requirePrincipal("mediaBannersManageAll", { capability: capabilityForMediaTarget("banners") })).resolves.toMatchObject({ role: "SUPER_ADMIN" });
  });
});
