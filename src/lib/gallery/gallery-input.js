import { z } from "zod";
import { GALLERY_CATEGORY_ORDER } from "@/features/marketing/data/gallery";
import { isTrustedImageUrl } from "@/lib/images/trusted-url";

// Gallery items uploaded by the shop (pure helpers shared by the admin screens and the public page).

export const GALLERY_CATEGORIES = GALLERY_CATEGORY_ORDER;
export const GALLERY_ID_PATTERN = /^[a-f\d]{24}$/i;

const noMarkup = (value) => !/[\u0000-\u001f\u007f<>]/.test(value);

export const GalleryMetaSchema = z.strictObject({
  title: z.string().trim().min(2, "Give the photo a short title (at least 2 characters).").max(80, "Use 80 characters or fewer.").refine(noMarkup, "Remove special characters from the title."),
  category: z.enum(GALLERY_CATEGORIES, { error: "Choose a category." }),
  alt: z.string().trim().min(5, "Describe the photo in a few words for people who cannot see it.").max(200, "Use 200 characters or fewer.").refine(noMarkup, "Remove special characters from the description."),
});

export function galleryFieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function shapeFor(width, height) {
  const ratio = Number(width) / Number(height);
  if (!Number.isFinite(ratio)) return "square";
  if (ratio >= 1.25) return "wide";
  if (ratio <= 0.8) return "tall";
  return "square";
}

// Only photos hosted by our image provider are ever shown (Cloudinary, plus older ImgBB photos).
export { isTrustedImageUrl };

// Public gallery from database documents: only active items with a trusted image, newest first.
// Returns the shapes GalleryGrid expects, plus an id -> image address map.
export function normalizePublicGallery(documents, limit = 60) {
  if (!Array.isArray(documents)) return { items: [], images: {} };
  const items = [];
  const images = {};
  const usable = documents
    .filter((doc) => doc && doc.active === true && isTrustedImageUrl(doc.displayUrl) && typeof doc.title === "string" && GALLERY_CATEGORIES.includes(doc.category))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  for (const doc of usable) {
    const id = `u-${String(doc.id)}`;
    items.push(Object.freeze({ id, category: doc.category, title: doc.title.slice(0, 80), alt: String(doc.alt ?? doc.title).slice(0, 200), shape: shapeFor(doc.width, doc.height) }));
    images[id] = doc.displayUrl;
  }
  return { items, images };
}

// Combines shop photos with the built-in items. Once the shop has uploaded photos, labelled concept
// (sample) images are dropped so real photos are not mixed with stock imagery.
export function mergeGallery({ uploaded, builtIn, builtInImages }) {
  const hasUploads = uploaded.items.length > 0;
  const kept = hasUploads ? builtIn.filter((item) => !item.sample) : builtIn;
  return {
    items: [...uploaded.items, ...kept],
    images: { ...builtInImages, ...uploaded.images },
    showsSamples: kept.some((item) => item.sample),
  };
}
