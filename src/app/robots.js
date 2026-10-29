import { getPublicOrigin } from "@/config/public-origin";

export const dynamic = "force-dynamic";

export default function robots() {
  const origin = getPublicOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/design-system", "/user", "/admin", "/super-admin", "/two-factor"],
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
