import "server-only";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";
import { getDeletionRequest } from "@/lib/account/deletion-request";
import { getMongo } from "@/lib/db/mongo";

// Only photos hosted by our image provider are ever rendered.
export function safeAvatarUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && url.hostname === "i.ibb.co" ? url.toString() : null;
  } catch {
    return null;
  }
}

// Photo and pending deletion request of the signed-in user.
export async function loadAccountExtras() {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!session?.user) return { image: null, deletion: null };
  const { db } = await getMongo();
  return { image: safeAvatarUrl(session.user.image), deletion: await getDeletionRequest(db, session.user.id) };
}
