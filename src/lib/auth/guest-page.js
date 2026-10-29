import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { landingPathFor } from "@/config/dashboard-access";
import { getAuth } from "@/lib/auth/server";

export async function redirectSignedInUserFromGuestPage() {
  await connection();
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect(landingPathFor(session.user.role));
}
