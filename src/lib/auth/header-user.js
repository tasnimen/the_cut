import "server-only";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";

// Minimal, non-sensitive session view for the header. Never throws: if the auth
// backend is unreachable the header simply renders the signed-out state.
export async function getHeaderUser() {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user;
    if (!user || user.status !== "ACTIVE") return null;
    return { name: user.name || "", email: user.email || "", image: user.image || null, role: user.role || "USER" };
  } catch {
    return null;
  }
}
