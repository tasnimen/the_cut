import "server-only";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";
import { getDeletionRequest } from "@/lib/account/deletion-request";
import { getMongo } from "@/lib/db/mongo";
import { isTrustedImageUrl } from "@/lib/images/trusted-url";

// Only photos hosted by our image provider are ever rendered (Cloudinary, plus older ImgBB photos).
export function safeAvatarUrl(value) {
  return isTrustedImageUrl(value) ? new URL(String(value)).toString() : null;
}

// Photo and pending deletion request of the signed-in user.
export async function loadAccountExtras() {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!session?.user) return { image: null, deletion: null };
  const { db } = await getMongo();
  return { image: safeAvatarUrl(session.user.image), deletion: await getDeletionRequest(db, session.user.id) };
}
