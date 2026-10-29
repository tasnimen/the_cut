// Browser-side helpers for image uploads (no server imports). Photos are shrunk and re-encoded to WebP
// before they are sent, so a phone photo of 8 to 12 MB becomes a few hundred kilobytes and stays under
// the 4 MB request limit. The server still checks the type and size and resizes again, so nothing here is trusted.

export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const UPLOAD_MAX_LONG_SIDE = 2000;
export const UPLOAD_ACCEPTED_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp", "image/avif"]);
export const UPLOAD_ACCEPT_ATTRIBUTE = UPLOAD_ACCEPTED_TYPES.join(",");

// Largest size that fits inside `max` on the long side, never enlarging. Whole pixels, at least 1.
export function fitWithin(width, height, max = UPLOAD_MAX_LONG_SIDE) {
  if (!(width > 0) || !(height > 0)) return { width: 1, height: 1 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// Which message to show for a failed upload: "too_large", "wrong_type", "rate_limited", "denied" or "provider_error".
export function uploadFailureKind(status, { hasFieldErrors = false } = {}) {
  if (status === 413) return "too_large";
  if (status === 429) return "rate_limited";
  if (status === 401 || status === 403) return "denied";
  if (status === 400 && !hasFieldErrors) return "wrong_type";
  if (status >= 500 || status === 0) return "provider_error";
  return "provider_error";
}

// Toast key for each failure kind (see lib/toast/messages.js).
export const UPLOAD_TOAST_KEYS = Object.freeze({
  too_large: "uploadTooLarge",
  wrong_type: "uploadWrongType",
  rate_limited: "rateLimited",
  denied: "adminDenied",
  provider_error: "uploadProviderError",
  network: "network",
});

// Checks a chosen file before any work is done. Returns null when it is acceptable.
export function checkChosenFile(file) {
  if (!file || typeof file === "string" || file.size === 0) return "wrong_type";
  if (!UPLOAD_ACCEPTED_TYPES.includes(file.type)) return "wrong_type";
  return null;
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

// Shrinks to 2000 px on the long side and re-encodes to WebP, lowering the quality until it fits the limit.
// Falls back to the original file when the browser cannot decode it and it is already small enough.
// Throws an Error with code "too_large" or "wrong_type" when the photo cannot be sent.
export async function prepareImageForUpload(file) {
  const problem = checkChosenFile(file);
  if (problem) throw Object.assign(new Error(problem), { code: problem });
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size <= UPLOAD_MAX_BYTES) return file;
    throw Object.assign(new Error("too_large"), { code: "too_large" });
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    for (const quality of [0.85, 0.75, 0.65, 0.5]) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= UPLOAD_MAX_BYTES) return new File([blob], "photo.webp", { type: "image/webp" });
    }
  } finally {
    bitmap.close?.();
  }
  throw Object.assign(new Error("too_large"), { code: "too_large" });
}
