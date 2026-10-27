import { env } from "@/config/env";

const localHostnames = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function getPublicOrigin() {
  if (!env.SITE_URL) return null;
  const url = new URL(env.SITE_URL);
  if (localHostnames.has(url.hostname)) return null;
  return url.origin;
}
