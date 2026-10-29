import { describe, expect, it } from "vitest";
import { galleryCategories, galleryItems, visibleGalleryItems } from "./gallery.js";

describe("gallery visibility", () => {
  it("shows only the labelled samples while no photos have been added", () => {
    const items = visibleGalleryItems(galleryItems, () => false);
    expect(items.every((item) => item.sample)).toBe(true);
    expect(items).toHaveLength(3);
    expect(galleryCategories(items)).toEqual(["All", "Studio", "Tools & details"]);
  });

  it("adds an item and its tab once its photo exists", () => {
    const items = visibleGalleryItems(galleryItems, (item) => item.id === "05" || item.id === "04");
    expect(items.map((item) => item.id)).toEqual(expect.arrayContaining(["04", "05"]));
    expect(galleryCategories(items)).toEqual(["All", "Haircuts", "Beards", "Studio", "Tools & details"]);
  });

  it("lists the mockup tabs in order when every category has photos", () => {
    const items = visibleGalleryItems(galleryItems, () => true);
    expect(galleryCategories(items).slice(0, 6)).toEqual(["All", "Haircuts", "Beards", "Shaves", "Styles", "Events"]);
  });
});
