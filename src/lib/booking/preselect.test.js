import { describe, expect, it } from "vitest";
import { bookingHrefForPackage, bookingHrefForService, resolvePreselect } from "./preselect.js";

describe("resolvePreselect", () => {
  it("accepts catalog slugs only, deduplicated and capped at three", () => {
    expect(resolvePreselect({ service: "haircut" })).toEqual(["haircut"]);
    expect(resolvePreselect({ service: ["haircut", "haircut", "shave"] })).toEqual(["haircut", "shave"]);
    expect(resolvePreselect({ service: "haircut,beard-trim,shave,hair-color" })).toEqual(["haircut", "beard-trim", "shave"]);
  });

  it("drops unknown, malformed and hostile values", () => {
    expect(resolvePreselect({ service: "../etc/passwd" })).toEqual([]);
    expect(resolvePreselect({ service: ["<script>", "nope", 5, null] })).toEqual([]);
    expect(resolvePreselect({ service: "__proto__" })).toEqual([]);
    expect(resolvePreselect({})).toEqual([]);
    expect(resolvePreselect()).toEqual([]);
  });

  it("maps a valid package to its catalog services and ignores unknown packages", () => {
    expect(resolvePreselect({ package: "standard" })).toEqual(["combo"]);
    expect(resolvePreselect({ package: "gold" })).toEqual([]);
  });

  it("prefers an explicit service over a package", () => {
    expect(resolvePreselect({ service: "shave", package: "standard" })).toEqual(["shave"]);
  });

  it("builds encoded booking links", () => {
    expect(bookingHrefForService("hair-color")).toBe("/booking?service=hair-color");
    expect(bookingHrefForPackage("basic")).toBe("/booking?package=basic");
  });
});
