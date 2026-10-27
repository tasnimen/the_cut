import { getPublicOrigin } from "@/config/public-origin";
import { routeRegistry } from "@/config/routes";

export const dynamic = "force-dynamic";

export default function sitemap() {
  const origin = getPublicOrigin();
  if (!origin) return [];

  return routeRegistry
    .filter(({ access, implemented, path }) => access === "public" && implemented && !path.includes("#"))
    .map(({ path }) => ({ url: new URL(path, origin).toString() }));
}
