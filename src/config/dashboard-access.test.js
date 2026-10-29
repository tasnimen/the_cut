import { describe, expect, it } from "vitest";
import { DASHBOARD_AREAS, areaForPath, decideDashboardAccess, landingPathFor } from "./dashboard-access.js";

const session = (role, extra = {}) => ({ user: { role, status: "ACTIVE", twoFactorEnabled: true, ...extra }, versionCurrent: true });

describe("decideDashboardAccess role matrix", () => {
  const cases = [
    // area, role, expected
    ["user", "USER", "allow"], ["user", "ADMIN", "allow"], ["user", "SUPER_ADMIN", "allow"],
    ["admin", "USER", "notFound"], ["admin", "ADMIN", "allow"], ["admin", "SUPER_ADMIN", "allow"],
    ["superAdmin", "USER", "notFound"], ["superAdmin", "ADMIN", "notFound"], ["superAdmin", "SUPER_ADMIN", "allow"],
  ];
  it.each(cases)("%s area with role %s -> %s", (area, role, expected) => {
    expect(decideDashboardAccess(DASHBOARD_AREAS[area], session(role)).action).toBe(expected);
  });

  it("sends guests to sign-in for the customer area only; admin areas answer 404", () => {
    expect(decideDashboardAccess(DASHBOARD_AREAS.user, null).action).toBe("signIn");
    expect(decideDashboardAccess(DASHBOARD_AREAS.admin, null).action).toBe("notFound");
    expect(decideDashboardAccess(DASHBOARD_AREAS.superAdmin, null).action).toBe("notFound");
  });

  it("treats suspended accounts, unknown roles and stale sessions as unauthorized", () => {
    expect(decideDashboardAccess(DASHBOARD_AREAS.user, session("USER", { status: "SUSPENDED" })).action).toBe("notFound");
    expect(decideDashboardAccess(DASHBOARD_AREAS.user, session("OWNER")).action).toBe("notFound");
    expect(decideDashboardAccess(DASHBOARD_AREAS.admin, { ...session("ADMIN"), versionCurrent: false }).action).toBe("notFound");
    expect(decideDashboardAccess(DASHBOARD_AREAS.user, { ...session("USER"), versionCurrent: false }).action).toBe("signIn");
  });

  it("requires TOTP enrolment for the admin areas only", () => {
    expect(decideDashboardAccess(DASHBOARD_AREAS.admin, session("ADMIN", { twoFactorEnabled: false })).action).toBe("twoFactor");
    expect(decideDashboardAccess(DASHBOARD_AREAS.superAdmin, session("SUPER_ADMIN", { twoFactorEnabled: false })).action).toBe("twoFactor");
    expect(decideDashboardAccess(DASHBOARD_AREAS.user, session("USER", { twoFactorEnabled: false })).action).toBe("allow");
  });
});

describe("paths and landing", () => {
  it("maps paths to areas without matching look-alike prefixes", () => {
    expect(areaForPath("/admin")?.key).toBe("admin");
    expect(areaForPath("/admin/bookings")?.key).toBe("admin");
    expect(areaForPath("/super-admin/audit")?.key).toBe("superAdmin");
    expect(areaForPath("/administrators")).toBeNull();
    expect(areaForPath("/booking")).toBeNull();
  });

  it("lands admins on their dashboards and customers on the public site until the user dashboard exists", () => {
    expect(landingPathFor("SUPER_ADMIN")).toBe("/super-admin");
    expect(landingPathFor("ADMIN")).toBe("/admin");
    expect(landingPathFor("USER")).toBe("/");
    expect(landingPathFor(undefined)).toBe("/");
  });
});

import { decideEnrolmentAccess } from "./dashboard-access.js";

describe("decideEnrolmentAccess", () => {
  const s = (role, extra = {}) => ({ user: { role, status: "ACTIVE", twoFactorEnabled: false, ...extra }, versionCurrent: true });

  it("lets only not-yet-enrolled active admins enrol", () => {
    expect(decideEnrolmentAccess(s("ADMIN")).action).toBe("allow");
    expect(decideEnrolmentAccess(s("SUPER_ADMIN")).action).toBe("allow");
    expect(decideEnrolmentAccess(s("USER")).action).toBe("notFound");
    expect(decideEnrolmentAccess(s("ADMIN", { status: "SUSPENDED" })).action).toBe("notFound");
  });

  it("sends guests and stale sessions to sign-in and enrolled admins on to their dashboard", () => {
    expect(decideEnrolmentAccess(null).action).toBe("signIn");
    expect(decideEnrolmentAccess({ ...s("ADMIN"), versionCurrent: false }).action).toBe("signIn");
    expect(decideEnrolmentAccess(s("ADMIN", { twoFactorEnabled: true })).action).toBe("done");
  });
});
