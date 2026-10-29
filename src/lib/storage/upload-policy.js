// 4 MB: a serverless request body limit makes larger uploads fail, and the image service accepts far more.
// The browser shrinks photos before sending; the server re-encodes to about 2000 px WebP.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// Every upload target has a fixed folder at the image service; no part of a path comes from the user.
const TARGET_RULES = Object.freeze({
  gallery: { permission: "mediaGalleryManageAll", ownerOnly: false, folder: "the-cut/gallery" },
  products: { permission: "mediaProductsManageAll", ownerOnly: false, folder: "the-cut/products" },
  barbers: { permission: "mediaBarbersManageAll", ownerOnly: false, folder: "the-cut/barbers" },
  services: { permission: "mediaServicesManageAll", ownerOnly: false, folder: "the-cut/services" },
  banners: { permission: "mediaBannersManageAll", ownerOnly: false, folder: "the-cut/banners" },
  slots: { permission: "mediaSlotsManageAll", ownerOnly: false, folder: "the-cut/slots" },
  avatar: { permission: "mediaAvatarOwn", ownerOnly: true, folder: "the-cut/avatars" },
});

const signatures = [
  { type: "image/jpeg", matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { type: "image/png", matches: (bytes) => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", matches: (bytes) => bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" },
  { type: "image/avif", matches: (bytes) => bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp" && /^(avif|avis)$/.test(bytes.toString("ascii", 8, 12)) },
];

export class UploadValidationError extends Error {
  constructor(code) {
    super(code);
    this.name = "UploadValidationError";
    this.code = code;
  }
}

export function getMediaTargetRule(target) {
  return TARGET_RULES[target] || null;
}

export function canUploadMedia(role, target) {
  const rule = getMediaTargetRule(target);
  if (!rule) return false;
  if (rule.ownerOnly) return ["USER", "ADMIN", "SUPER_ADMIN"].includes(role);
  return ["ADMIN", "SUPER_ADMIN"].includes(role);
}

export function inspectImageBytes({ bytes, declaredType, size = bytes?.length }) {
  if (!Number.isSafeInteger(size) || size <= 0) throw new UploadValidationError("empty_file");
  if (size > MAX_IMAGE_BYTES) throw new UploadValidationError("file_too_large");
  if (!Buffer.isBuffer(bytes) || bytes.length !== size) throw new UploadValidationError("invalid_file");

  const detected = signatures.find(({ matches }) => matches(bytes))?.type;
  if (!detected) throw new UploadValidationError("unsupported_file_type");
  if (detected !== declaredType) throw new UploadValidationError("mime_mismatch");
  return Object.freeze({ mimeType: detected, extension: detected === "image/jpeg" ? "jpg" : detected.split("/")[1] });
}

export function validateProcessedDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 12000 || height > 12000) {
    throw new UploadValidationError("invalid_dimensions");
  }
}
