import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { accountMenu, getAccountMenuItems, isProtectedPath } from "./navigation.js";

describe("account menu", () => {
  it("shows only enabled entries the role may open", () => {
    const customer = getAccountMenuItems("USER").map((item) => item.href);
    expect(customer).toContain("/booking");
    expect(customer).not.toContain("/admin");
    expect(getAccountMenuItems("GUEST")).toEqual([]);
    const planned = [{ label: "X", href: "/x", roles: ["ADMIN"], enabled: false }, { label: "Y", href: "/y", roles: ["ADMIN"], enabled: true }];
    expect(getAccountMenuItems("ADMIN", planned).map((item) => item.href)).toEqual(["/y"]);
    expect(getAccountMenuItems("USER", planned)).toEqual([]);
  });

  it("only enables routes whose page exists", () => {
    for (const item of accountMenu.filter((entry) => entry.enabled)) {
      const dir = path.join(process.cwd(), "src/app", item.href);
      const exists = ["page.js", "page.jsx"].some((file) => fs.existsSync(path.join(dir, file)));
      expect(exists, item.href).toBe(true);
    }
  });

  it("recognizes protected paths", () => {
    expect(isProtectedPath("/dashboard/profile")).toBe(true);
    expect(isProtectedPath("/admin")).toBe(true);
    expect(isProtectedPath("/booking")).toBe(false);
    expect(isProtectedPath("/administrators")).toBe(false);
  });
});
