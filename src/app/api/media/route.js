import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { getAuth } from "@/lib/auth/server";
import { env } from "@/config/env";
import { ensureApplicationIndexes, getMongo } from "@/lib/db/mongo";
import { UploadValidationError, getMediaTargetRule, MAX_IMAGE_BYTES } from "@/lib/storage/upload-policy";
import { createMediaService } from "@/lib/storage/media-service";
import { processImageUpload } from "@/lib/storage/image-processor";
import { upload as uploadToStorage, remove as removeFromStorage } from "@/lib/storage";
import { consumePublicRateLimit } from "@/lib/security/public-rate-limit";
import { MEDIA_COLLECTION } from "@/lib/storage/media-model";

export const runtime = "nodejs";

const fieldsSchema = z.object({
  target: z.enum(["gallery", "products", "barbers", "services", "avatar"]),
  alt: z.string().trim().min(1).max(300),
}).strict();

function responseError(message, status) {
  return NextResponse.json({ message }, { status });
}

function mapError(error) {
  if (error instanceof AuthorizationError) return responseError("Not authorized.", error.status);
  if (error instanceof UploadValidationError) {
    const message = ["file_too_large", "processed_file_too_large"].includes(error.code)
      ? "Image must be 5 MB or smaller after processing."
      : "Choose a supported image with a matching file type.";
    return responseError(message, 400);
  }
  if (error?.status === 403) return responseError("Not authorized.", 403);
  return responseError("Image could not be processed. Try again.", 500);
}

function buildService(db) {
  return createMediaService({
    processImage: processImageUpload,
    storage: { upload: uploadToStorage, delete: removeFromStorage },
    saveMedia: async (record) => {
      const result = await db.collection(MEDIA_COLLECTION).insertOne(record);
      return result.insertedId;
    },
    deleteMediaRecord: async (id) => db.collection(MEDIA_COLLECTION).deleteOne({ _id: id }),
  });
}

export async function POST(request) {
  try {
    const rawContentLength = request.headers.get("content-length");
    if (!rawContentLength || !/^\d+$/.test(rawContentLength)) return responseError("Content length is required for image uploads.", 411);
    const contentLength = Number(rawContentLength);
    if (contentLength > MAX_IMAGE_BYTES + 128 * 1024) return responseError("Image must be 5 MB or smaller.", 413);

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return responseError("Authentication required.", 401);
    const rate = await consumePublicRateLimit(request, { bucket: "media-upload", limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return responseError("Upload limit reached. Try again later.", 429);

    const formData = await request.formData();
    const fields = fieldsSchema.safeParse({ target: formData.get("target"), alt: formData.get("alt") });
    const file = formData.get("file");
    if (!fields.success || !file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return responseError("Choose an image and provide its target and alt text.", 400);
    }
    if (file.size > MAX_IMAGE_BYTES) return responseError("Image must be 5 MB or smaller.", 413);

    const rule = getMediaTargetRule(fields.data.target);
    const principal = await requirePrincipal(rule.permission);
    if (principal.role === "USER" && fields.data.target !== "avatar") return responseError("Not authorized.", 403);

    const { db } = await getMongo();
    await ensureApplicationIndexes(db);
    const media = await buildService(db).upload({ principal, target: fields.data.target, file, alt: fields.data.alt });
    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    return mapError(error);
  }
}

const deleteSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).strict();

export async function DELETE(request) {
  try {
    const payload = deleteSchema.safeParse(await request.json());
    if (!payload.success) return responseError("Invalid media identifier.", 400);
    const { db } = await getMongo();
    await ensureApplicationIndexes(db);
    const id = new ObjectId(payload.data.id);
    const record = await db.collection(MEDIA_COLLECTION).findOne({ _id: id });
    if (!record) return responseError("Image not found.", 404);
    const rule = getMediaTargetRule(record.category);
    if (!rule) return responseError("Image not found.", 404);
    const principal = await requirePrincipal(rule.permission);
    const rate = await consumePublicRateLimit(request, { bucket: "media-delete", limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return responseError("Upload limit reached. Try again later.", 429);
    await buildService(db).delete({ principal, record });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return mapError(error);
  }
}
