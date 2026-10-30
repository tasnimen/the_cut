import { NextResponse } from "next/server";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { getMongo } from "@/lib/db/mongo";
import { revalidateCatalog } from "@/lib/catalog/revalidate";
import { countGalleryItems, createGalleryItem, MAX_GALLERY_ITEMS } from "@/lib/gallery/admin-gallery";
import { galleryFieldErrors, GalleryMetaSchema } from "@/lib/gallery/gallery-input";
import { buildMediaService, removeGalleryMedia } from "@/lib/gallery/media";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";
import { MAX_IMAGE_BYTES, UploadValidationError } from "@/lib/storage/upload-policy";

export const runtime = "nodejs";

// Adds a photo to the gallery. Needs mediaGalleryManageAll (Admin, Super Admin, TOTP) on every call and is
// rate limited per user. Only `file`, `title`, `category` and `alt` are read; the stored address, size and
// owner come from the upload pipeline, never from the request.

const json = (body, status) => NextResponse.json(body, { status });

export async function POST(request) {
  try {
    const rawLength = request.headers.get("content-length");
    if (!rawLength || !/^\d+$/.test(rawLength)) return json({ message: "Content length is required." }, 411);
    if (Number(rawLength) > MAX_IMAGE_BYTES + 128 * 1024) return json({ message: "Image must be 4 MB or smaller." }, 413);

    const principal = await requirePrincipal("mediaGalleryManageAll", { capability: "gallery.upload" });
    const rate = await consumeUserRateLimit(principal.id, { bucket: "admin-gallery-upload", limit: 30, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return json({ message: "Too many uploads. Try again later." }, 429);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") return json({ message: "Choose a photo." }, 400);
    if (file.size > MAX_IMAGE_BYTES) return json({ message: "Image must be 4 MB or smaller." }, 413);
    const title = String(formData.get("title") ?? "");
    const parsed = GalleryMetaSchema.safeParse({ title, category: String(formData.get("category") ?? ""), alt: String(formData.get("alt") ?? "") || title });
    if (!parsed.success) return json({ message: "Check the highlighted fields.", fieldErrors: galleryFieldErrors(parsed.error) }, 400);

    const { db } = await getMongo();
    if ((await countGalleryItems(db)) >= MAX_GALLERY_ITEMS) return json({ message: `The gallery is full (${MAX_GALLERY_ITEMS} photos). Delete one first.` }, 409);

    const media = await buildMediaService(db, principal.id).upload({ principal, target: "gallery", file, alt: parsed.data.alt });
    try {
      const id = await createGalleryItem(db, { media, meta: parsed.data }, principal.id);
      revalidateCatalog(["gallery"]);
      return json({ id }, 201);
    } catch (error) {
      await removeGalleryMedia(db, principal, media.id).catch(() => {});
      throw error;
    }
  } catch (error) {
    if (error instanceof AuthorizationError) return json({ message: "Please sign in again to continue." }, error.status);
    if (error instanceof UploadValidationError) {
      return json({ message: ["file_too_large", "processed_file_too_large"].includes(error.code) ? "Image must be 4 MB or smaller." : "Choose a JPG, PNG, WebP or AVIF image." }, 400);
    }
    console.error("gallery upload failed:", error?.name, error?.message);
    return json({ message: "The photo could not be saved. Check the image service settings and try again." }, 500);
  }
}
