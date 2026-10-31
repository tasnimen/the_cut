import { describe, expect, it } from "vitest";
import {
  ADMIN_CAPABILITIES, ADMIN_CAPABILITY_GROUPS, ADMIN_ROUTE_CAPABILITIES, capabilityAllowed, capabilityForMediaTarget, catalogImageCapability,
  allGrants, capabilityForAdminPath, denyAllGrants, describeEffectiveGrants, groupOf, isKnownCapability, resolveGrants, validateGrantsInput,
} from "./admin-capabilities.js";

describe("the capability catalog", () => {
  it("has unique ids of the form group.action, and every group has a view (except API-only groups)", () => {
    expect(new Set(ADMIN_CAPABILITIES).size).toBe(ADMIN_CAPABILITIES.length);
    for (const id of ADMIN_CAPABILITIES) expect(id).toMatch(/^[a-zA-Z]+\.[a-zA-Z]+$/);
    for (const group of ADMIN_CAPABILITY_GROUPS) {
      for (const capability of group.capabilities) expect(groupOf(capability.id)).toBe(group.key);
      if (group.routes.length > 0) expect(group.capabilities.some((capability) => capability.id === `${group.key}.view`) || group.key === "bookings").toBe(true);
    }
    expect(ADMIN_CAPABILITIES).toContain("bookings.view");
  });
  it("covers the actions the owner asked to control", () => {
    for (const id of ["bookings.view", "bookings.walkIn", "bookings.changeStatus", "bookings.cancel", "customers.view", "gallery.view", "gallery.upload", "gallery.hide", "gallery.delete", "messages.view", "messages.markStatus", "messages.delete", "reports.view"]) {
      expect(isKnownCapability(id), id).toBe(true);
    }
  });
  it("maps every admin route to a known capability, and never offers Super Admin areas", () => {
    for (const [route, capability] of Object.entries(ADMIN_ROUTE_CAPABILITIES)) {
      expect(route.startsWith("/admin/")).toBe(true);
      expect(isKnownCapability(capability), route).toBe(true);
    }
    expect(Object.keys(ADMIN_ROUTE_CAPABILITIES).some((route) => route.includes("super-admin") || route.includes("permissions") || route.includes("audit"))).toBe(false);
    expect(ADMIN_CAPABILITIES.some((id) => /permission|audit|account|security|revenue/i.test(id))).toBe(false);
  });
  it("lists the same routes in the groups and in the route map", () => {
    const grouped = ADMIN_CAPABILITY_GROUPS.flatMap((group) => group.routes).sort();
    expect(grouped).toEqual(Object.keys(ADMIN_ROUTE_CAPABILITIES).sort());
  });
});

describe("resolveGrants", () => {
  it("defaults to everything off (default deny until the Super Admin saves)", () => {
    const grants = resolveGrants(undefined);
    expect(Object.keys(grants).sort()).toEqual([...ADMIN_CAPABILITIES].sort());
    expect(Object.values(grants).every((value) => value === false)).toBe(true);
    expect(resolveGrants(null)).toEqual(denyAllGrants());
    expect(resolveGrants({})).toEqual(denyAllGrants());
  });
  it("applies stored booleans, and ignores unknown keys, junk values and wrong shapes", () => {
    const grants = resolveGrants({ "messages.delete": false, "gallery.upload": "no", "fake.power": true, "__proto__": { x: 1 } });
    expect(grants["messages.delete"]).toBe(false);
    expect(grants["gallery.upload"]).toBe(false);
    expect(Object.hasOwn(grants, "fake.power")).toBe(false);
    for (const bad of ["x", 5, [], true]) expect(resolveGrants(bad)).toEqual(denyAllGrants());
  });
});

describe("capabilityAllowed", () => {
  const off = (...ids) => resolveGrants({ ...allGrants(), ...Object.fromEntries(ids.map((id) => [id, false])) });
  it("allows what is on and denies what is off", () => {
    expect(capabilityAllowed(allGrants(), "messages.delete")).toBe(true);
    expect(capabilityAllowed(off("messages.delete"), "messages.delete")).toBe(false);
    expect(capabilityAllowed(off("messages.delete"), "messages.markStatus")).toBe(true);
  });
  it("turns a whole group off when its view is off", () => {
    const grants = off("gallery.view");
    for (const id of ["gallery.view", "gallery.upload", "gallery.hide", "gallery.delete"]) expect(capabilityAllowed(grants, id), id).toBe(false);
    expect(capabilityAllowed(grants, "reports.view")).toBe(true);
  });
  it("supports any-of lists and denies unknown ids and empty input", () => {
    const grants = off("services.create");
    expect(capabilityAllowed(grants, ["services.create", "services.edit"])).toBe(true);
    expect(capabilityAllowed(off("services.create", "services.edit"), ["services.create", "services.edit"])).toBe(false);
    for (const bad of ["nope.view", "", undefined, null, [], ["x.y"], 5]) expect(capabilityAllowed(allGrants(), bad)).toBe(false);
  });
});

describe("validateGrantsInput", () => {
  it("accepts a partial set of known booleans and returns the full map", () => {
    const result = validateGrantsInput({ "bookings.view": true });
    expect(result.ok).toBe(true);
    expect(result.grants["messages.delete"]).toBe(false);
    expect(result.grants["bookings.view"]).toBe(true);
  });
  it("rejects unknown capabilities, non-booleans and wrong shapes", () => {
    expect(validateGrantsInput({ "super.power": true })).toEqual({ ok: false, error: "unknown_capability" });
    expect(validateGrantsInput({ "messages.delete": "yes" })).toEqual({ ok: false, error: "not_boolean" });
    for (const bad of [null, "x", [], 7]) expect(validateGrantsInput(bad).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("map media targets and picture kinds to capabilities", () => {
    expect(capabilityForMediaTarget("gallery")).toBe("gallery.upload");
    expect(capabilityForMediaTarget("avatar")).toBeNull();
    expect(capabilityForMediaTarget("banners")).toBe("siteImages.manage");
    for (const target of ["services", "packages", "barbers"]) for (const id of capabilityForMediaTarget(target)) expect(isKnownCapability(id)).toBe(true);
    expect(catalogImageCapability("services")).toEqual(["services.create", "services.edit"]);
  });
  it("describes what an Admin can do for the review screen", () => {
    const review = describeEffectiveGrants(resolveGrants({ ...allGrants(), "gallery.view": false, "messages.delete": false }));
    const gallery = review.find((group) => group.key === "gallery");
    expect(gallery.allowed).toEqual([]);
    expect(gallery.denied.length).toBe(5);
    expect(review.find((group) => group.key === "messages").denied).toEqual(["Delete messages"]);
  });
});

describe("site images (a group with no page and no view switch)", () => {
  it("depends only on its own switch, and stays default deny", () => {
    expect(capabilityAllowed(allGrants(), "siteImages.manage")).toBe(true);
    expect(capabilityAllowed(resolveGrants({ ...allGrants(), "siteImages.manage": false }), "siteImages.manage")).toBe(false);
    expect(capabilityAllowed(denyAllGrants(), "siteImages.manage")).toBe(false);
    expect(capabilityAllowed(resolveGrants(undefined), "siteImages.manage")).toBe(false);
    for (const target of ["banners", "slots", "products"]) expect(capabilityAllowed(allGrants(), capabilityForMediaTarget(target))).toBe(true);
  });
  it("does not weaken groups that have a view switch", () => {
    const grants = resolveGrants({ ...allGrants(), "gallery.view": false });
    expect(capabilityAllowed(grants, "gallery.upload")).toBe(false);
    expect(capabilityAllowed(grants, "siteImages.manage")).toBe(true);
  });
  it("shows what an Admin can do with site images in the review", () => {
    const review = describeEffectiveGrants(allGrants()).find((group) => group.key === "siteImages");
    expect(review.allowed).toEqual(["Upload banner, slot and product images"]);
    expect(review.denied).toEqual([]);
  });
});

describe("capabilityForAdminPath", () => {
  it("maps every page route to its switch, including dynamic routes", () => {
    for (const [route, capability] of Object.entries(ADMIN_ROUTE_CAPABILITIES)) {
      expect(capabilityForAdminPath(route.replace(/[[a-z]+]/g, "some-value")), route).toBe(capability);
    }
  });
  it("prefers the exact route over a dynamic one, and ignores a trailing slash", () => {
    expect(capabilityForAdminPath("/admin/barbers/new")).toBe("barbers.create");
    expect(capabilityForAdminPath("/admin/barbers/daniel-carter")).toBe("barbers.edit");
    expect(capabilityForAdminPath("/admin/barbers/")).toBe("barbers.view");
  });
  it("needs no switch for the overview, and returns null for anything else", () => {
    for (const path of ["/admin", "/admin/", "/admin/nothing-here", "/admin/barbers/a/b", "/user", "", undefined, null, 5]) expect(capabilityForAdminPath(path), String(path)).toBeNull();
  });
});

describe("archive and restore switches (D2a)", () => {
  const KINDS = ["services", "packages", "barbers"];
  it("exist for services, packages and barbers, are known and default deny", () => {
    for (const kind of KINDS) for (const action of ["archive", "restore"]) {
      expect(isKnownCapability(`${kind}.${action}`), `${kind}.${action}`).toBe(true);
      expect(capabilityAllowed(resolveGrants(undefined), `${kind}.${action}`)).toBe(false);
      expect(capabilityAllowed(resolveGrants({ ...allGrants(), [`${kind}.${action}`]: false }), `${kind}.${action}`)).toBe(false);
    }
    expect(ADMIN_CAPABILITIES).toHaveLength(34);
  });
  it("are independent of each other and of edit, but still need the page (view) switch", () => {
    for (const kind of KINDS) {
      const onlyArchive = resolveGrants({ [`${kind}.view`]: true, [`${kind}.archive`]: true });
      expect(capabilityAllowed(onlyArchive, `${kind}.archive`)).toBe(true);
      expect(capabilityAllowed(onlyArchive, `${kind}.restore`)).toBe(false);
      expect(capabilityAllowed(onlyArchive, `${kind}.edit`)).toBe(false);
      const noView = resolveGrants({ ...allGrants(), [`${kind}.view`]: false });
      expect(capabilityAllowed(noView, `${kind}.archive`)).toBe(false);
      expect(capabilityAllowed(noView, `${kind}.restore`)).toBe(false);
    }
  });
  it("an old saved record without the new switches leaves them off", () => {
    const old = resolveGrants(Object.fromEntries(ADMIN_CAPABILITIES.filter((id) => !/.(archive|restore)$/.test(id)).map((id) => [id, true])));
    expect(capabilityAllowed(old, "services.edit")).toBe(true);
    expect(capabilityAllowed(old, "services.archive")).toBe(false);
  });
});

describe("email log switches", () => {
  it("are known, default deny, need the page switch for Resend, and the page is mapped", () => {
    for (const id of ["emailLog.view", "emailLog.resend"]) {
      expect(isKnownCapability(id)).toBe(true);
      expect(capabilityAllowed(resolveGrants(undefined), id)).toBe(false);
    }
    expect(ADMIN_ROUTE_CAPABILITIES["/admin/email-log"]).toBe("emailLog.view");
    expect(capabilityForAdminPath("/admin/email-log")).toBe("emailLog.view");
    expect(capabilityAllowed(resolveGrants({ "emailLog.view": true, "emailLog.resend": true }), "emailLog.resend")).toBe(true);
    expect(capabilityAllowed(resolveGrants({ "emailLog.resend": true }), "emailLog.resend")).toBe(false);
    expect(capabilityAllowed(resolveGrants({ "emailLog.view": true }), "emailLog.resend")).toBe(false);
  });
});
