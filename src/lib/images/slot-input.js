import { IMAGE_SLOTS } from "@/config/images";
import { isTrustedImageUrl } from "@/lib/images/trusted-url";

// Image slot overrides (pure): a slot key from config/images.js pointing at a stored Media image.
// The local file or built-in fallback is used whenever no valid override exists.

export function isKnownSlot(slot) {
  return typeof slot === "string" && Object.hasOwn(IMAGE_SLOTS, slot);
}

// Database documents -> { [slot]: { url, alt, width, height } }. Unknown slots and untrusted addresses are dropped.
export function normalizeSlotOverrides(documents, cloudName = process.env.CLOUDINARY_CLOUD_NAME) {
  const out = {};
  if (!Array.isArray(documents)) return out;
  for (const doc of documents) {
    if (!doc || !isKnownSlot(doc.slot) || !isTrustedImageUrl(doc.secureUrl, cloudName)) continue;
    out[doc.slot] = Object.freeze({
      url: String(doc.secureUrl),
      alt: typeof doc.alt === "string" ? doc.alt.slice(0, 300) : "",
      width: Number.isInteger(doc.width) && doc.width > 0 ? doc.width : undefined,
      height: Number.isInteger(doc.height) && doc.height > 0 ? doc.height : undefined,
    });
  }
  return out;
}
