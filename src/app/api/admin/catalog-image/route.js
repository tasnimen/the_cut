import { NextResponse } from "next/server";
import { z } from "zod";
import { catalogImageCapability } from "@/config/admin-capabilities";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { CATALOG_KINDS, discardPendingMedia, sweepStaleMedia } from "@/lib/catalog/catalog-images";
import { CATALOG_IMAGE_KINDS, MEDIA_ID_PATTERN } from "@/lib/catalog/image-input";
import { getMongo } from "@/lib/db/mongo";
import { buildMediaService, removeGalleryMedia } from "@/lib/gallery/media";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";
import { MAX_IMAGE_BYTES, UploadValidationError } from "@/lib/storage/upload-policy";

export const runtime = "nodejs";

// Pending pictures for the service, barber and package editors. POST stores an uploaded picture (nothing is
// attached yet: the form's Save does that after the record itself saved); DELETE discards a pending, still
// unattached picture. Every call checks the session and the kind's media permission, so a customer, a guest
// or an admin acting on a kind they may not manage is refused. Only `kind` and `file` (or `mediaId`) are read.

const KindSchema = z.enum(CATALOG_IMAGE_KINDS);
const json = (body, status) => NextResponse.json(body, { status });

function failureResponse(error) {
  if (error instanceof AuthorizationError) return json({ message: "Please sign in again to continue." }, error.status);
  if (error instanceof UploadValidationError) {
    return json({ message: ["file_too_large", "processed_file_too_large"].includes(error.code) ? "Image must be 4 MB or smaller." : "Choose a JPG, PNG, WebP or AVIF image." }, 400);
  }
  console.error("catalog image failed:", error?.name, error?.message);
  return json({ message: "The picture could not be saved. Try again." }, 500);
}

export async function POST(request) {
  try {
    const rawLength = request.headers.get("content-length");
    if (!rawLength || !/^\d+$/.test(rawLength)) return json({ message: "Content length is required." }, 411);
    if (Number(rawLength) > MAX_IMAGE_BYTES + 128 * 1024) return json({ message: "Image must be 4 MB or smaller." }, 413);

    const formData = await request.formData();
    const kind = KindSchema.safeParse(formData.get("kind"));
    const file = formData.get("file");
    if (!kind.success || !file || typeof file === "string" || typeof file.arrayBuffer !== "function") return json({ message: "Choose a picture." }, 400);

    const principal = await requirePrincipal(CATALOG_KINDS[kind.data].permission, { capability: catalogImageCapability(kind.data) });
    const rate = await consumeUserRateLimit(principal.id, { bucket: "admin-catalog-image", limit: 40, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return json({ message: "Too many uploads. Try again later." }, 429);
    if (file.size > MAX_IMAGE_BYTES) return json({ message: "Image must be 4 MB or smaller." }, 413);

    const { db } = await getMongo();
    // Tidy up uploads that were never attached (best effort, never blocks this upload).
    await sweepStaleMedia(db, kind.data, (mediaId) => removeGalleryMedia(db, principal, mediaId)).catch(() => {});
    const media = await buildMediaService(db, principal.id).upload({ principal, target: kind.data, file, alt: `${kind.data} picture` });
    return json({ mediaId: media.id, url: media.secureUrl, width: media.width, height: media.height }, 201);
  } catch (error) {
    return failureResponse(error);
  }
}

const DeleteSchema = z.strictObject({ kind: KindSchema, mediaId: z.string().regex(MEDIA_ID_PATTERN) });

export async function DELETE(request) {
  try {
    const parsed = DeleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ message: "That request was not valid." }, 400);
    const principal = await requirePrincipal(CATALOG_KINDS[parsed.data.kind].permission, { capability: catalogImageCapability(parsed.data.kind) });
    const rate = await consumeUserRateLimit(principal.id, { bucket: "admin-catalog-image", limit: 40, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return json({ message: "Too many requests. Try again later." }, 429);
    const { db } = await getMongo();
    const result = await discardPendingMedia(db, parsed.data.kind, parsed.data.mediaId, (mediaId) => removeGalleryMedia(db, principal, mediaId));
    if (!result.ok) return json({ message: "That picture was not found or is already in use." }, result.error === "attached" ? 409 : 404);
    return json({ discarded: true }, 200);
  } catch (error) {
    return failureResponse(error);
  }
}
