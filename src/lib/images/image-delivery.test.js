import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config.mjs";
import { IMAGE_DEVICE_SIZES, IMAGE_MIN_CACHE_SECONDS, IMAGE_QUALITIES, IMAGE_SMALL_SIZES } from "../../config/image-sizes.mjs";

// Credit-saving guard: the site may only ever ask the optimizer for the fixed set of widths, never
// bypass it, and never fetch an original at full size by accident.
const SRC = path.join(process.cwd(), "src");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

// Every <Image ...> / <ImageWithFallback ...> opening tag, braces balanced so "=>" inside props is safe.
function imageTags(source) {
  const tags = [];
  const start = /<(Image|ImageWithFallback)\b/g;
  let match;
  while ((match = start.exec(source))) {
    let depth = 0;
    let index = match.index + match[0].length;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      else if (char === ">" && depth === 0) break;
    }
    tags.push({ name: match[1], text: source.slice(match.index, index + 1) });
  }
  return tags;
}

const files = walk(SRC).map((file) => ({ file: path.relative(SRC, file), source: fs.readFileSync(file, "utf8") }));
const allTags = files.flatMap(({ file, source }) => imageTags(source).map((tag) => ({ file, ...tag })));

describe("image delivery settings", () => {
  it("the optimizer only knows the fixed widths, one quality, WebP and a long cache", () => {
    const { images } = nextConfig;
    expect(images.deviceSizes).toEqual([...IMAGE_DEVICE_SIZES]);
    expect(images.imageSizes).toEqual([...IMAGE_SMALL_SIZES]);
    expect(images.qualities).toEqual([...IMAGE_QUALITIES]);
    expect(images.formats).toEqual(["image/webp"]);
    expect(images.minimumCacheTTL).toBe(IMAGE_MIN_CACHE_SECONDS);
    expect(IMAGE_DEVICE_SIZES.length + IMAGE_SMALL_SIZES.length).toBeLessThanOrEqual(10);
  });

  it("limits remote images to our Cloudinary folder tree (when a cloud name is set) and older ImgBB images", () => {
    const hosts = nextConfig.images.remotePatterns.map((pattern) => pattern.hostname);
    expect(hosts.every((host) => ["res.cloudinary.com", "i.ibb.co"].includes(host))).toBe(true);
    for (const pattern of nextConfig.images.remotePatterns) expect(pattern.protocol).toBe("https");
    for (const pattern of nextConfig.images.remotePatterns.filter((item) => item.hostname === "res.cloudinary.com")) expect(pattern.pathname).not.toBe("/**");
  });
});

describe("how images are used in the code", () => {
  it("finds the image components it should check", () => {
    expect(allTags.length).toBeGreaterThan(8);
  });
  it("never bypasses the optimizer or sets its own loader or quality", () => {
    for (const { file, text } of allTags) {
      expect(text, file).not.toMatch(/\bunoptimized\b|\bloader=/);
      for (const quality of text.matchAll(/\bquality=\{?(\d+)/g)) expect(IMAGE_QUALITIES, file).toContain(Number(quality[1]));
    }
    for (const { file, source } of files) expect(source, file).not.toMatch(/loaderFile|from "cloudinary"|f_auto|q_auto/);
  });
  it("gives every fill image a sizes hint, so the browser never takes the largest variant by default", () => {
    for (const { file, text } of allTags.filter((tag) => /\bfill\b/.test(tag.text))) expect(text, file).toMatch(/\bsizes=/);
  });
  it("uses no plain <img> elements, which would deliver originals at full size", () => {
    for (const { file, source } of files) expect(source, file).not.toMatch(/<img\b/);
  });
});
