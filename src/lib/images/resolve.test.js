import { describe, expect, it } from "vitest";
import { IMAGE_SLOTS, IMAGE_SLOT_KEYS } from "../../config/images.js";
import { resolveImage } from "./resolve.js";

describe("image slots", () => {
  it("defines sane dimensions, files and fallbacks for every slot", () => {
    const files = new Set();
    for (const key of IMAGE_SLOT_KEYS) {
      const slot = IMAGE_SLOTS[key];
      expect(slot.width).toBeGreaterThan(0);
      expect(slot.height).toBeGreaterThan(0);
      expect(slot.fallback.startsWith("/images/")).toBe(true);
      expect(files.has(slot.file)).toBe(false);
      files.add(slot.file);
      if (!slot.decorative) expect(slot.alt.length).toBeGreaterThan(0);
    }
  });

  it("falls back to the configured asset when no photo was added", () => {
    expect(resolveImage("hero", { available: [] })).toMatchObject({ source: "fallback", src: "/images/banner1.png", alt: "" });
  });

  it("prefers a photo placed in public/images, in extension priority order", () => {
    expect(resolveImage("service-haircut", { available: ["service-haircut.jpg", "service-haircut.webp"] })).toMatchObject({ source: "file", src: "/images/service-haircut.webp" });
  });

  it("accepts an ImgBB override and rejects other hosts", () => {
    const ok = resolveImage("about-story", { available: ["about-story.webp"], overrides: { "about-story": { url: "https://i.ibb.co/abc/story.webp", alt: "The shop", width: 1000, height: 700 } } });
    expect(ok).toMatchObject({ source: "override", src: "https://i.ibb.co/abc/story.webp", alt: "The shop", width: 1000 });
    const bad = resolveImage("about-story", { available: [], overrides: { "about-story": { url: "https://evil.example/x.jpg" } } });
    expect(bad.source).toBe("fallback");
    expect(resolveImage("about-story", { overrides: { "about-story": { url: "http://i.ibb.co/x.jpg" } } }).source).toBe("fallback");
  });

  it("throws for an unknown slot", () => {
    expect(() => resolveImage("nope")).toThrow(/Unknown image slot/);
  });
});
