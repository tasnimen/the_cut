import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DASHBOARD_NAV, breadcrumbsFor, greetingFor, isNavItemActive, visibleNav } from "./dashboard-nav.js";

describe("dashboard navigation", () => {
  it("lists only enabled entries", () => {
    expect(visibleNav("user").map((entry) => entry.label)).toEqual(["Overview", "Appointments", "Profile"]);
    expect(visibleNav("admin").map((entry) => entry.label)).toEqual(["Overview", "Bookings", "Customers", "Services", "Packages", "Barbers", "Messages", "Settings"]);
    expect(visibleNav("superAdmin").map((entry) => entry.href)).toEqual(["/super-admin", "/admin"]);
    expect(visibleNav("nope")).toEqual([]);
  });

  it("only enables hrefs whose page exists", () => {
    for (const entries of Object.values(DASHBOARD_NAV)) {
      for (const entry of entries.filter((candidate) => candidate.enabled)) {
        const dir = path.join(process.cwd(), "src/app", entry.href);
        const exists = ["page.js", "page.jsx"].some((file) => fs.existsSync(path.join(dir, file)));
        expect(exists, entry.href).toBe(true);
      }
    }
  });

  it("marks the area root active only on an exact match, deeper entries on their subtree", () => {
    const overview = { href: "/admin" };
    const bookings = { href: "/admin/bookings" };
    expect(isNavItemActive(overview, "/admin")).toBe(true);
    expect(isNavItemActive(overview, "/admin/bookings")).toBe(false);
    expect(isNavItemActive(bookings, "/admin/bookings/42")).toBe(true);
    expect(isNavItemActive(bookings, "/admin/bookingsx")).toBe(false);
  });

  it("builds breadcrumbs from the nav config", () => {
    expect(breadcrumbsFor("/admin").map((crumb) => crumb.label)).toEqual(["Home", "Admin"]);
    const nav = { admin: [{ label: "Overview", href: "/admin", enabled: true }, { label: "Bookings", href: "/admin/bookings", enabled: true }] };
    expect(breadcrumbsFor("/admin/bookings/7", nav).map((crumb) => crumb.label)).toEqual(["Home", "Admin", "Bookings"]);
    expect(breadcrumbsFor("/booking").map((crumb) => crumb.label)).toEqual(["Home"]);
  });

  it("greets by the business time zone", () => {
    expect(greetingFor(new Date("2027-04-05T13:00:00Z"), "America/New_York")).toBe("Good morning");
    expect(greetingFor(new Date("2027-04-05T18:00:00Z"), "America/New_York")).toBe("Good afternoon");
    expect(greetingFor(new Date("2027-04-05T23:30:00Z"), "America/New_York")).toBe("Good evening");
    expect(greetingFor(new Date("2027-04-05T04:30:00Z"), "America/New_York")).toBe("Good evening");
  });
});
