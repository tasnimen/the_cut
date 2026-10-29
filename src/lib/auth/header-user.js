import "server-only";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";
import { createCooldown } from "@/lib/utils/cooldown";

// If the auth backend fails, show the signed-out header instantly for a while instead of making every
// public page wait for the database timeout.
const cooldown = createCooldown({ ms: 30_000 });

// Minimal, non-sensitive session view for the header. Never throws: if the auth
// backend is unreachable the header simply renders the signed-out state.
export async function getHeaderUser() {
  try {
    const requestHeaders = await headers();
    const session = await cooldown(async () => (await getAuth()).api.getSession({ headers: requestHeaders }));
    const user = session?.user;
    if (!user || user.status !== "ACTIVE") return null;
    return { name: user.name || "", email: user.email || "", image: user.image || null, role: user.role || "USER" };
  } catch {
    return null;
  }
}
