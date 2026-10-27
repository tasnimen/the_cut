import { getPublicOrigin } from "@/config/public-origin";

export const dynamic = "force-dynamic";

export default function robots() {
  const origin = getPublicOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/design-system"],
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
