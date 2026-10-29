// Which image addresses the site is willing to render. Pure: the cloud name is passed in (or read from the
// server environment); it is not a secret. Older images were stored on ImgBB (i.ibb.co) and stay renderable.
export const LEGACY_IMAGE_HOST = "i.ibb.co";
export const CLOUDINARY_IMAGE_HOST = "res.cloudinary.com";

export function isTrustedImageUrl(value, cloudName = process.env.CLOUDINARY_CLOUD_NAME) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (url.hostname === LEGACY_IMAGE_HOST) return true;
    return Boolean(cloudName) && url.hostname === CLOUDINARY_IMAGE_HOST && url.pathname.startsWith(`/${cloudName}/`);
  } catch {
    return false;
  }
}
