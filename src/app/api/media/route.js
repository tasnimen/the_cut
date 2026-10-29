import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { getAuth } from "@/lib/auth/server";
import { ensureApplicationIndexes, getMongo } from "@/lib/db/mongo";
import { UploadValidationError, getMediaTargetRule, MAX_IMAGE_BYTES } from "@/lib/storage/upload-policy";
import { buildMediaService } from "@/lib/storage/build-service";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";
import { MEDIA_CATEGORIES, MEDIA_COLLECTION } from "@/lib/storage/media-model";

export const runtime = "nodejs";

// Generic upload and delete for images (every target in lib/storage/upload-policy.js). Each call checks the
// session, then the target's permission (a customer may only use "avatar", and only for their own), a per-user
// rate limit, a 4 MB cap, the file's real type and size, and the audit log gets an entry for every upload and
// delete. Error texts shown to users are generic.

const fieldsSchema = z.object({
  target: z.enum(MEDIA_CATEGORIES),
  alt: z.string().trim().min(1).max(300),
}).strict();

const MB = MAX_IMAGE_BYTES / (1024 * 1024);

function responseError(message, status) {
  return NextResponse.json({ message }, { status });
}

function mapError(error) {
  if (error instanceof AuthorizationError) return responseError("Not authorized.", error.status);
  if (error instanceof UploadValidationError) {
    const message = ["file_too_large", "processed_file_too_large"].includes(error.code)
      ? `Image must be ${MB} MB or smaller.`
      : "Choose a supported image with a matching file type.";
    return responseError(message, 400);
  }
  if (error?.status === 403) return responseError("Not authorized.", 403);
  console.error("media route failed:", error?.name, error?.message);
  return responseError("Image could not be processed. Try again.", 500);
}

export async function POST(request) {
  try {
    const rawContentLength = request.headers.get("content-length");
    if (!rawContentLength || !/^\d+$/.test(rawContentLength)) return responseError("Content length is required for image uploads.", 411);
    if (Number(rawContentLength) > MAX_IMAGE_BYTES + 128 * 1024) return responseError(`Image must be ${MB} MB or smaller.`, 413);

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return responseError("Authentication required.", 401);

    const formData = await request.formData();
    const fields = fieldsSchema.safeParse({ target: formData.get("target"), alt: formData.get("alt") });
    const file = formData.get("file");
    if (!fields.success || !file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return responseError("Choose an image and provide its target and alt text.", 400);
    }
    if (file.size > MAX_IMAGE_BYTES) return responseError(`Image must be ${MB} MB or smaller.`, 413);

    const rule = getMediaTargetRule(fields.data.target);
    const principal = await requirePrincipal(rule.permission);
    if (principal.role === "USER" && fields.data.target !== "avatar") return responseError("Not authorized.", 403);
    const rate = await consumeUserRateLimit(principal.id, { bucket: "media-upload", limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return responseError("Upload limit reached. Try again later.", 429);

    const { db } = await getMongo();
    await ensureApplicationIndexes(db);
    const media = await buildMediaService(db, principal.id).upload({ principal, target: fields.data.target, file, alt: fields.data.alt });
    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    return mapError(error);
  }
}

const deleteSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).strict();

export async function DELETE(request) {
  try {
    const payload = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) return responseError("Invalid media identifier.", 400);
    const { db } = await getMongo();
    await ensureApplicationIndexes(db);
    const record = await db.collection(MEDIA_COLLECTION).findOne({ _id: new ObjectId(payload.data.id) });
    const rule = record ? getMediaTargetRule(record.category) : null;
    if (!record || !rule) return responseError("Image not found.", 404);
    const principal = await requirePrincipal(rule.permission);
    const rate = await consumeUserRateLimit(principal.id, { bucket: "media-delete", limit: 20, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return responseError("Upload limit reached. Try again later.", 429);
    await buildMediaService(db, principal.id).delete({ principal, record });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return mapError(error);
  }
}
