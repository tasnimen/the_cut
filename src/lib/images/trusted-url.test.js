import { describe, expect, it } from "vitest";
import { isTrustedImageUrl } from "./trusted-url.js";
import { IMAGE_DEVICE_SIZES, IMAGE_PRESETS, IMAGE_SMALL_SIZES } from "../../config/image-sizes.mjs";

describe("isTrustedImageUrl", () => {
  it("trusts our own Cloudinary folder tree and older ImgBB images only", () => {
    expect(isTrustedImageUrl("https://res.cloudinary.com/demo/image/upload/v1/the-cut/gallery/a.webp", "demo")).toBe(true);
    expect(isTrustedImageUrl("https://i.ibb.co/x/y.webp", "demo")).toBe(true);
    for (const bad of [
      "https://res.cloudinary.com/other/image/upload/a.webp", "https://res.cloudinary.com/demo-evil/a.webp", "http://res.cloudinary.com/demo/a.webp",
      "https://res.cloudinary.com.evil.com/demo/a.webp", "https://u:p@res.cloudinary.com/demo/a.webp", "https://res.cloudinary.com:8443/demo/a.webp",
      "https://evil.example/demo/a.webp", "javascript:alert(1)", "", null, undefined,
    ]) expect(isTrustedImageUrl(bad, "demo")).toBe(false);
  });
  it("trusts no Cloudinary address when no cloud name is configured", () => {
    expect(isTrustedImageUrl("https://res.cloudinary.com/demo/a.webp", undefined)).toBe(false);
    expect(isTrustedImageUrl("https://res.cloudinary.com/demo/a.webp", "")).toBe(false);
  });
});

describe("image size presets", () => {
  it("only ever use widths from the fixed lists, so no extra variants are created", () => {
    const allowed = new Set([...IMAGE_DEVICE_SIZES, ...IMAGE_SMALL_SIZES]);
    for (const [name, preset] of Object.entries(IMAGE_PRESETS)) {
      expect(allowed.has(preset.width), `${name} width ${preset.width}`).toBe(true);
      expect(preset.height).toBeGreaterThan(0);
    }
    expect(Object.keys(IMAGE_PRESETS).sort()).toEqual(["avatar", "banner", "card", "hero", "thumb"]);
    expect(allowed.size).toBeLessThanOrEqual(10);
  });
});
