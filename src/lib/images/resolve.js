import { BLUR_DATA_URL, IMAGE_EXTENSIONS, IMAGE_SLOTS } from "@/config/images";

// Only ImgBB-hosted URLs may override a slot (matches the allow-listed next/image host).
const OVERRIDE_HOST = "i.ibb.co";

function validOverrideUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === OVERRIDE_HOST;
  } catch {
    return false;
  }
}

// Pure resolver. `available` is the list of file names present in public/images,
// `overrides` maps slot key -> { url, alt?, width?, height? } (Phase I Media records).
export function resolveImage(slotKey, { available = [], overrides = {} } = {}) {
  const definition = IMAGE_SLOTS[slotKey];
  if (!definition) throw new Error(`Unknown image slot: ${slotKey}`);

  const override = overrides[slotKey];
  const overrideValid = override && validOverrideUrl(override.url);
  const localFile = IMAGE_EXTENSIONS.map((ext) => `${definition.file}.${ext}`).find((name) => available.includes(name));

  const src = overrideValid ? override.url : localFile ? `/images/${localFile}` : definition.fallback;
  return {
    slot: slotKey,
    src,
    source: overrideValid ? "override" : localFile ? "file" : "fallback",
    alt: definition.decorative ? "" : (overrideValid && override.alt) || definition.alt,
    width: (overrideValid && override.width) || definition.width,
    height: (overrideValid && override.height) || definition.height,
    objectPosition: definition.focal,
    blurDataURL: BLUR_DATA_URL,
  };
}
