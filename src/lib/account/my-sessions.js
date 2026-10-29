import "server-only";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";
import { shapeSessions } from "@/lib/account/account-input";

// The signed-in user's own active sessions (tokens are never returned).
export async function loadMySessions() {
  const auth = await getAuth();
  const requestHeaders = await headers();
  const [session, rows] = await Promise.all([
    auth.api.getSession({ headers: requestHeaders }),
    auth.api.listSessions({ headers: requestHeaders }),
  ]);
  if (!session?.user) return [];
  return shapeSessions(rows, { currentSessionId: session.session.id, userVersion: session.user.sessionVersion });
}
