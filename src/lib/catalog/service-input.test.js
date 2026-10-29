import { describe, expect, it } from "vitest";
import { describeChanges, parsePriceToMinorUnits, readServiceForm } from "./service-input.js";

function form(values) {
  const data = new Map(Object.entries(values));
  return { get: (key) => (data.has(key) ? data.get(key) : null) };
}

const valid = { name: " Haircut ", description: "A clean cut.", price: "25", durationMinutes: "30", displayOrder: "1", category: "haircut", icon: "scissors", active: "on" };

describe("parsePriceToMinorUnits", () => {
  it("converts dollars to cents and rejects everything unsafe", () => {
    expect(parsePriceToMinorUnits("25")).toBe(2500);
    expect(parsePriceToMinorUnits("25.5")).toBe(2550);
    expect(parsePriceToMinorUnits(" 25.05 ")).toBe(2505);
    for (const bad of ["0", "0.00", "-5", "25.999", "abc", "1e3", "$25", "25,00", "", "99999", null, undefined, 25]) {
      expect(parsePriceToMinorUnits(bad)).toBeNull();
    }
  });
});

describe("readServiceForm", () => {
  it("parses a valid edit form", () => {
    const result = readServiceForm(form(valid), { withSlug: false });
    expect(result).toEqual({ ok: true, data: { name: "Haircut", description: "A clean cut.", priceMinorUnits: 2500, durationMinutes: 30, displayOrder: 1, category: "haircut", icon: "scissors", active: true } });
  });

  it("treats a missing checkbox as inactive and ignores unknown form keys (mass assignment)", () => {
    const { active: _unused, ...rest } = valid;
    const result = readServiceForm(form({ ...rest, role: "ADMIN", currency: "EUR", _id: "x", slug: "evil" }), { withSlug: false });
    expect(result.ok).toBe(true);
    expect(result.data.active).toBe(false);
    expect(Object.keys(result.data).sort()).toEqual(["active", "category", "description", "displayOrder", "durationMinutes", "icon", "name", "priceMinorUnits"]);
  });

  it("requires and validates the slug on create only", () => {
    expect(readServiceForm(form({ ...valid, slug: "Hot-Towel" }), { withSlug: true })).toMatchObject({ ok: true, data: { slug: "hot-towel" } });
    for (const slug of ["", "a", "has space", "-lead", "trail-", "../x", "UPPER_case", "a".repeat(61)]) {
      const result = readServiceForm(form({ ...valid, slug }), { withSlug: true });
      expect(result.ok, slug).toBe(false);
      expect(result.fieldErrors.slug).toBeTruthy();
    }
  });

  it("reports field errors for bad numbers, price, category and icon", () => {
    const result = readServiceForm(form({ ...valid, price: "free", durationMinutes: "two", displayOrder: "-1", category: "x", icon: "y" }), { withSlug: false });
    expect(result.ok).toBe(false);
    expect(Object.keys(result.fieldErrors).sort()).toEqual(["category", "displayOrder", "durationMinutes", "icon", "price"]);
    expect(readServiceForm(form({ ...valid, name: "   " }), { withSlug: false }).fieldErrors.name).toBeTruthy();
    expect(readServiceForm(form({ ...valid, durationMinutes: "4" }), { withSlug: false }).fieldErrors.durationMinutes).toBeTruthy();
  });
});

describe("describeChanges", () => {
  it("lists changed fields without copying free text", () => {
    const before = { name: "A", description: "x", durationMinutes: 30, priceMinorUnits: 2500, active: true, displayOrder: 1, category: "haircut", icon: "scissors" };
    expect(describeChanges(before, { ...before, name: "B", priceMinorUnits: 3000, active: false })).toEqual({ name: "changed", priceMinorUnits: "2500->3000", active: "true->false" });
    expect(describeChanges(before, before)).toEqual({});
  });
});
