import { isTrustedImageUrl } from "@/lib/images/trusted-url";

// Optional picture of a service, barber or package (pure rules, no database).
// A record carries `image: { mediaId, secureUrl, width, height, alt }`; records without it keep working and
// the public site falls back to the local file or placeholder.

export const CATALOG_IMAGE_KINDS = Object.freeze(["services", "barbers", "packages"]);
export const MEDIA_ID_PATTERN = /^[a-f\d]{24}$/i;
export const ALT_MIN = 5;
export const ALT_MAX = 200;

const noMarkup = (value) => !/[\u0000-\u001f\u007f<>]/.test(value);
const text = (formData, key) => (typeof formData.get(key) === "string" ? formData.get(key) : "");

// Reads exactly three keys: imageMediaId (a pending upload), imageAlt, removeImage. Never an address or size.
export function readImageFields(formData) {
  const mediaId = text(formData, "imageMediaId").trim();
  const alt = text(formData, "imageAlt").trim();
  const remove = formData.get("removeImage") === "on" || formData.get("removeImage") === "1";
  const fieldErrors = {};
  if (mediaId && !MEDIA_ID_PATTERN.test(mediaId)) fieldErrors.image = "Upload the picture again.";
  if (alt && !noMarkup(alt)) fieldErrors.imageAlt = "Remove special characters from the description.";
  if (alt.length > ALT_MAX) fieldErrors.imageAlt = `Use ${ALT_MAX} characters or fewer.`;
  if (mediaId && !remove && alt.length < ALT_MIN && !fieldErrors.imageAlt) fieldErrors.imageAlt = "Describe the picture in a few words (at least 5 characters).";
  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, data: { mediaId: mediaId || null, alt, remove: remove && !mediaId } };
}

// What to do with the record's picture. A new upload wins over "remove"; changing only the text updates the alt.
export function planImageChange(current, fields) {
  if (fields.mediaId) return { type: "attach", mediaId: fields.mediaId, alt: fields.alt };
  if (fields.remove) return current ? { type: "remove" } : { type: "none" };
  if (current && fields.alt && fields.alt !== current.alt) return { type: "alt", alt: fields.alt };
  return { type: "none" };
}

// Database value -> safe object for pages and the browser (or null). Never passes anything unknown through.
export function normalizeImage(value, cloudName = process.env.CLOUDINARY_CLOUD_NAME) {
  if (!value || typeof value !== "object" || !isTrustedImageUrl(value.secureUrl, cloudName)) return null;
  return Object.freeze({
    mediaId: typeof value.mediaId === "string" ? value.mediaId : null,
    url: String(value.secureUrl),
    alt: typeof value.alt === "string" ? value.alt.slice(0, ALT_MAX) : "",
    width: Number.isInteger(value.width) && value.width > 0 ? value.width : null,
    height: Number.isInteger(value.height) && value.height > 0 ? value.height : null,
  });
}

// Same, without the media id: this is what the public site gets.
export function publicImage(value, cloudName) {
  const image = normalizeImage(value, cloudName);
  return image ? Object.freeze({ url: image.url, alt: image.alt, width: image.width, height: image.height }) : null;
}

// A picture for components that need { src, alt, ... }: the record's own picture, else the slot helper's.
export function pictureFor(record, fallback) {
  const image = record?.image;
  return image?.url ? { ...fallback, src: image.url, alt: image.alt || fallback?.alt || "", source: "upload" } : fallback;
}
