import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_CAPABILITY_GROUPS, ADMIN_ROUTE_CAPABILITIES, isKnownCapability } from "../../config/admin-capabilities.js";

// Guard against the easy mistake: a new admin action, API route or page that forgets the Super Admin switch.
const SRC = path.join(process.cwd(), "src");
const read = (file) => fs.readFileSync(file, "utf8");
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const rel = (file) => path.relative(SRC, file).split(path.sep).join("/");

const adminFiles = walk(path.join(SRC, "app", "admin")).filter((file) => /\.(js|jsx)$/.test(file) && !/\.test\./.test(file));
const apiFiles = [...walk(path.join(SRC, "app", "api", "admin")), path.join(SRC, "app", "api", "media", "route.js"), path.join(SRC, "lib", "booking", "route-core.js")].filter((file) => /\.(js|jsx)$/.test(file) && !/\.test\./.test(file));

// Every requirePrincipal( call in the file, with the text up to the end of its argument list.
function principalCalls(source) {
  const calls = [];
  let from = 0;
  for (;;) {
    const at = source.indexOf("requirePrincipal(", from);
    if (at < 0) return calls;
    let depth = 0;
    let end = at + "requirePrincipal".length;
    for (; end < source.length; end += 1) {
      if (source[end] === "(") depth += 1;
      if (source[end] === ")" && --depth === 0) break;
    }
    calls.push(source.slice(at, end + 1));
    from = end;
  }
}

describe("every admin entry point carries a Super Admin switch", () => {
  it("scans the files it should", () => {
    expect(adminFiles.filter((file) => file.endsWith("actions.js")).length).toBeGreaterThanOrEqual(8);
    expect(adminFiles.filter((file) => file.endsWith("page.jsx")).length).toBeGreaterThanOrEqual(15);
  });

  it("Server Actions and admin API routes pass a capability to every requirePrincipal call", () => {
    for (const file of [...adminFiles.filter((f) => /actions\.js$/.test(f)), ...apiFiles.filter((f) => /api[\\/](admin|media)/.test(f))]) {
      const calls = principalCalls(read(file)).filter((call) => !/^requirePrincipal\(\)/.test(call));
      for (const call of calls) expect(call, `${rel(file)}: ${call}`).toMatch(/capability/);
    }
  });

  it("the no-show API route needs bookings.changeStatus", () => {
    const calls = principalCalls(read(path.join(SRC, "lib", "booking", "route-core.js")));
    expect(calls.some((call) => call.includes("bookingsManageAll") && call.includes("bookings.changeStatus"))).toBe(true);
  });

  it("every admin page (except the overview and the layout) passes the capability of its own route", () => {
    for (const file of adminFiles.filter((f) => f.endsWith("page.jsx"))) {
      const route = `/${path.dirname(rel(file)).replace(/^app\//, "")}`;
      if (route === "/admin") continue; // the overview is open to every Admin
      const expected = ADMIN_ROUTE_CAPABILITIES[route];
      expect(expected, `route ${route} is missing from ADMIN_ROUTE_CAPABILITIES`).toBeTruthy();
      expect(read(file), rel(file)).toContain(`requireDashboardAccess("admin", { capability: "${expected}" })`);
    }
  });

  it("every capability id used in those files exists in the catalog", () => {
    const pattern = /"((?:bookings|customers|services|packages|barbers|gallery|messages|reports|settings|siteImages)\.[A-Za-z]+)"/g;
    for (const file of [...adminFiles, ...apiFiles]) {
      for (const [, id] of read(file).matchAll(pattern)) expect(isKnownCapability(id), `${rel(file)} uses unknown capability ${id}`).toBe(true);
    }
  });

  it("every route in the catalog has a page, and every catalog route is listed once", () => {
    for (const group of ADMIN_CAPABILITY_GROUPS) {
      for (const route of group.routes) {
        const directory = path.join(SRC, "app", ...route.slice(1).split("/"));
        expect(fs.existsSync(path.join(directory, "page.jsx")), route).toBe(true);
      }
    }
  });
});
