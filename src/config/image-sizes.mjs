// The only image widths the site ever requests (pure constants, also read by next.config.mjs, hence the .mjs extension).
// Keeping this list small is what limits image-service usage: next/image never creates a variant
// for a width outside it. See docs/DECISIONS.md ("Image delivery loader").
export const IMAGE_DEVICE_SIZES = Object.freeze([480, 768, 1080, 1440, 1920]);
export const IMAGE_SMALL_SIZES = Object.freeze([96, 160, 320, 640]);
export const IMAGE_QUALITIES = Object.freeze([75]);
// How long the optimizer keeps a resized copy before asking the image service again (31 days).
export const IMAGE_MIN_CACHE_SECONDS = 60 * 60 * 24 * 31;

// Named presets used by the admin screens and the public components.
// `width` and `height` are the intrinsic size handed to next/image (a fixed aspect ratio, so there is no
// layout shift); `sizes` tells the browser which of the allowed widths to pick.
export const IMAGE_PRESETS = Object.freeze({
  thumb: Object.freeze({ width: 160, height: 120, sizes: "160px" }),
  card: Object.freeze({ width: 640, height: 480, sizes: "(max-width: 760px) 100vw, 320px" }),
  hero: Object.freeze({ width: 1920, height: 800, sizes: "100vw" }),
  banner: Object.freeze({ width: 1440, height: 480, sizes: "100vw" }),
  avatar: Object.freeze({ width: 96, height: 96, sizes: "96px" }),
  // Fixed aspect ratios for pictures an admin attaches to a record. `aspect` (width / height) is also the crop in the browser.
  "service-card": Object.freeze({ width: 640, height: 480, aspect: 4 / 3, sizes: "(max-width: 760px) 100vw, 320px" }),
  "barber-portrait": Object.freeze({ width: 640, height: 800, aspect: 4 / 5, sizes: "(max-width: 760px) 100vw, 320px" }),
  "package-card": Object.freeze({ width: 640, height: 480, aspect: 4 / 3, sizes: "(max-width: 760px) 100vw, 320px" }),
});
