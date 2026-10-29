import { describe, expect, it } from "vitest";
import { galleryFieldErrors, GalleryMetaSchema, isTrustedImageUrl, mergeGallery, normalizePublicGallery, shapeFor } from "@/lib/gallery/gallery-input";

const ok = { title: "Skin fade", category: "Haircuts", alt: "A skin fade from the side" };
const doc = (overrides = {}) => ({ id: "a1", active: true, displayUrl: "https://i.ibb.co/x/y.webp", title: "Fade", category: "Haircuts", alt: "A fade", width: 1200, height: 800, createdAt: new Date("2026-10-01"), ...overrides });

describe("GalleryMetaSchema", () => {
  it("accepts a normal item and trims", () => {
    expect(GalleryMetaSchema.parse({ ...ok, title: "  Skin fade " }).title).toBe("Skin fade");
  });
  it("rejects bad titles, unknown categories, short alt text, markup and unknown keys", () => {
    for (const bad of [{ ...ok, title: "x" }, { ...ok, title: "<b>x</b>" }, { ...ok, category: "Nope" }, { ...ok, alt: "no" }, { ...ok, active: true }, { ...ok, url: "https://evil" }]) {
      expect(GalleryMetaSchema.safeParse(bad).success).toBe(false);
    }
    expect(galleryFieldErrors(GalleryMetaSchema.safeParse({ ...ok, title: "", category: "Nope" }).error)).toMatchObject({ title: expect.any(String), category: expect.any(String) });
  });
});

describe("helpers", () => {
  it("picks a card shape from the photo size", () => {
    expect(shapeFor(1200, 800)).toBe("wide");
    expect(shapeFor(800, 1200)).toBe("tall");
    expect(shapeFor(1000, 1000)).toBe("square");
    expect(shapeFor(undefined, undefined)).toBe("square");
  });
  it("trusts only https i.ibb.co addresses", () => {
    expect(isTrustedImageUrl("https://i.ibb.co/a/b.webp")).toBe(true);
    for (const bad of ["http://i.ibb.co/a.webp", "https://evil.com/a.webp", "https://i.ibb.co.evil.com/a", "javascript:alert(1)", "https://u:p@i.ibb.co/a", "", null]) expect(isTrustedImageUrl(bad)).toBe(false);
  });
});

describe("normalizePublicGallery", () => {
  it("keeps active, trusted, known-category items newest first with a safe id and image map", () => {
    const result = normalizePublicGallery([
      doc({ id: "old", createdAt: new Date("2026-09-01") }),
      doc({ id: "new", createdAt: new Date("2026-10-20"), width: 800, height: 1200 }),
      doc({ id: "off", active: false }),
      doc({ id: "evil", displayUrl: "https://evil.com/x.webp" }),
      doc({ id: "cat", category: "Whatever" }),
    ]);
    expect(result.items.map((item) => item.id)).toEqual(["u-new", "u-old"]);
    expect(result.items[0].shape).toBe("tall");
    expect(result.images["u-new"]).toBe("https://i.ibb.co/x/y.webp");
    expect(Object.keys(result.images)).toHaveLength(2);
  });
  it("returns nothing for bad input and caps the count", () => {
    expect(normalizePublicGallery(null)).toEqual({ items: [], images: {} });
    expect(normalizePublicGallery(Array.from({ length: 100 }, (_, i) => doc({ id: String(i) }))).items).toHaveLength(60);
  });
});

describe("mergeGallery", () => {
  const builtIn = [{ id: "studio-wide", sample: true }, { id: "04", category: "Haircuts" }];
  it("keeps the built-in items, samples included, when nothing was uploaded", () => {
    const merged = mergeGallery({ uploaded: { items: [], images: {} }, builtIn, builtInImages: { "04": "/a.jpg" } });
    expect(merged.items.map((item) => item.id)).toEqual(["studio-wide", "04"]);
    expect(merged.showsSamples).toBe(true);
  });
  it("puts uploads first and drops concept samples once photos exist", () => {
    const merged = mergeGallery({ uploaded: { items: [{ id: "u-1" }], images: { "u-1": "https://i.ibb.co/a" } }, builtIn, builtInImages: { "04": "/a.jpg" } });
    expect(merged.items.map((item) => item.id)).toEqual(["u-1", "04"]);
    expect(merged.images).toEqual({ "04": "/a.jpg", "u-1": "https://i.ibb.co/a" });
    expect(merged.showsSamples).toBe(false);
  });
});
