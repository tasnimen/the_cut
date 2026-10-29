import { NextResponse } from "next/server";
import { AuthorizationError, requirePrincipal } from "@/lib/auth/authorization";
import { getAuth } from "@/lib/auth/server";
import { getMongo } from "@/lib/db/mongo";
import { AVATAR_ALT, createAvatarService } from "@/lib/account/avatar-core";
import { buildMediaService } from "@/lib/storage/build-service";
import { MEDIA_COLLECTION } from "@/lib/storage/media-model";
import { MAX_IMAGE_BYTES, UploadValidationError } from "@/lib/storage/upload-policy";
import { consumeUserRateLimit } from "@/lib/security/public-rate-limit";
import { appendAuditEvent } from "@/lib/security/audit-log";

export const runtime = "nodejs";

// Own-avatar upload and removal. The user is always the signed-in caller; the request carries only the file.
// Every call re-checks the session and the mediaAvatarOwn permission, is rate limited per user, and the
// image goes through the shared pipeline (type sniffing, size limit, re-encoding to WebP).

const json = (message, status) => NextResponse.json({ message }, { status });

function mapError(error) {
  if (error instanceof AuthorizationError) return json("Please sign in again to continue.", error.status);
  if (error instanceof UploadValidationError) {
    return json(["file_too_large", "processed_file_too_large"].includes(error.code) ? "Image must be 4 MB or smaller." : "Choose a JPG, PNG, WebP or AVIF image.", 400);
  }
  console.error("avatar route failed:", error?.name, error?.message);
  return json("Your photo could not be saved. Try again.", 500);
}

async function build(request, principal) {
  const { db } = await getMongo();
  const auth = await getAuth();
  return createAvatarService({
    media: buildMediaService(db, principal.id),
    listOwn: (ownerId) => db.collection(MEDIA_COLLECTION).find({ category: "avatar", ownerId }).toArray(),
    setImage: (_userId, image) => auth.api.updateUser({ headers: request.headers, body: { image } }),
    audit: (actor, action) => appendAuditEvent(db, { actorId: actor.id, action, targetType: "User", targetId: actor.id, outcome: "success" }),
  });
}

export async function POST(request) {
  try {
    const rawLength = request.headers.get("content-length");
    if (!rawLength || !/^\d+$/.test(rawLength)) return json("Content length is required.", 411);
    if (Number(rawLength) > MAX_IMAGE_BYTES + 128 * 1024) return json("Image must be 4 MB or smaller.", 413);

    const principal = await requirePrincipal("mediaAvatarOwn");
    const rate = await consumeUserRateLimit(principal.id, { bucket: "account-avatar", limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return json("Too many photo changes. Try again later.", 429);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") return json("Choose an image.", 400);
    if (file.size > MAX_IMAGE_BYTES) return json("Image must be 4 MB or smaller.", 413);

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    const result = await (await build(request, principal)).replace({ principal, file, alt: AVATAR_ALT(session?.user?.name) });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return mapError(error);
  }
}

export async function DELETE(request) {
  try {
    const principal = await requirePrincipal("mediaAvatarOwn");
    const rate = await consumeUserRateLimit(principal.id, { bucket: "account-avatar", limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rate.allowed) return json("Too many photo changes. Try again later.", 429);
    await (await build(request, principal)).remove({ principal });
    return NextResponse.json({ removed: true });
  } catch (error) {
    return mapError(error);
  }
}
