import { describe, expect, it } from "vitest";
import { describePackageChanges, parseInclusions, readPackageForm } from "./package-input.js";

function form(values, lists = {}) {
  const data = new Map(Object.entries(values));
  return { get: (key) => (data.has(key) ? data.get(key) : null), getAll: (key) => lists[key] ?? [] };
}
const valid = { name: " Standard ", note: "Most popular choice.", price: "40", inclusions: "Haircut\nBeard Trim\r\n\n  Wash & Style  ", displayOrder: "2", featured: "on", active: "on" };
const allowed = ["haircut", "beard-trim", "shave", "combo"];

describe("parseInclusions", () => {
  it("splits lines, trims and drops blanks", () => {
    expect(parseInclusions("A\r\n  B  \n\nC")).toEqual(["A", "B", "C"]);
    expect(parseInclusions(5)).toEqual([]);
  });
});

describe("readPackageForm", () => {
  it("parses a valid edit form with linked services", () => {
    const result = readPackageForm(form(valid, { bookingServiceSlugs: ["combo", "combo"] }), { withSlug: false, allowedServiceSlugs: allowed });
    expect(result).toEqual({ ok: true, data: { name: "Standard", note: "Most popular choice.", priceMinorUnits: 4000, inclusions: ["Haircut", "Beard Trim", "Wash & Style"], featured: true, active: true, displayOrder: 2, bookingServiceSlugs: ["combo"] } });
  });

  it("ignores unknown keys and treats missing checkboxes as off", () => {
    const { featured: _f, active: _a, ...rest } = valid;
    const result = readPackageForm(form({ ...rest, role: "ADMIN", currency: "EUR", slug: "evil" }), { withSlug: false, allowedServiceSlugs: allowed });
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ featured: false, active: false });
    expect(Object.keys(result.data).sort()).toEqual(["active", "bookingServiceSlugs", "displayOrder", "featured", "inclusions", "name", "note", "priceMinorUnits"]);
  });

  it("rejects services that do not exist, more than three services, and empty inclusions", () => {
    expect(readPackageForm(form(valid, { bookingServiceSlugs: ["nope"] }), { withSlug: false, allowedServiceSlugs: allowed }).fieldErrors.bookingServiceSlugs).toBeTruthy();
    expect(readPackageForm(form(valid, { bookingServiceSlugs: ["haircut", "beard-trim", "shave", "combo"] }), { withSlug: false, allowedServiceSlugs: allowed }).fieldErrors.bookingServiceSlugs).toBeTruthy();
    expect(readPackageForm(form({ ...valid, inclusions: "  \n " }), { withSlug: false }).fieldErrors.inclusions).toBeTruthy();
    expect(readPackageForm(form({ ...valid, inclusions: Array.from({ length: 13 }, (_, i) => `Item ${i}`).join("\n") }), { withSlug: false }).fieldErrors.inclusions).toBeTruthy();
  });

  it("validates price, order and the slug on create", () => {
    expect(readPackageForm(form({ ...valid, price: "free", displayOrder: "x" }), { withSlug: false }).fieldErrors).toMatchObject({ price: expect.any(String), displayOrder: expect.any(String) });
    expect(readPackageForm(form({ ...valid, slug: "Gold" }), { withSlug: true })).toMatchObject({ ok: true, data: { slug: "gold" } });
    expect(readPackageForm(form({ ...valid, slug: "bad slug" }), { withSlug: true }).fieldErrors.slug).toBeTruthy();
  });
});

describe("describePackageChanges", () => {
  it("summarizes changes without copying free text", () => {
    const before = { name: "A", note: "n", priceMinorUnits: 4000, featured: false, active: true, displayOrder: 1, inclusions: ["x"], bookingServiceSlugs: ["combo"] };
    expect(describePackageChanges(before, { ...before, name: "B", priceMinorUnits: 4500, inclusions: ["x", "y"], bookingServiceSlugs: [] })).toEqual({ name: "changed", priceMinorUnits: "4000->4500", inclusions: "1->2 items", bookingServiceSlugs: "changed" });
  });
});
