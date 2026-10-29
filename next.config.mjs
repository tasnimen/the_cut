import { IMAGE_DEVICE_SIZES, IMAGE_MIN_CACHE_SECONDS, IMAGE_QUALITIES, IMAGE_SMALL_SIZES } from "./src/config/image-sizes.mjs";

// The cloud name is not a secret; it only scopes which Cloudinary paths next/image may fetch.
// Read at build time, so rebuild after changing CLOUDINARY_CLOUD_NAME.
const cloudName = /^[A-Za-z0-9_-]{2,64}$/.test(process.env.CLOUDINARY_CLOUD_NAME ?? "") ? process.env.CLOUDINARY_CLOUD_NAME : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      ...(cloudName ? [{ protocol: "https", hostname: "res.cloudinary.com", pathname: `/${cloudName}/**` }] : []),
      // Older images were stored on ImgBB. Keep this pattern while such records exist (docs/DECISIONS.md).
      { protocol: "https", hostname: "i.ibb.co", pathname: "/**" },
    ],
    // Default loader with a small fixed set of widths: no per-page or per-visitor image variants.
    deviceSizes: [...IMAGE_DEVICE_SIZES],
    imageSizes: [...IMAGE_SMALL_SIZES],
    qualities: [...IMAGE_QUALITIES],
    formats: ["image/webp"],
    minimumCacheTTL: IMAGE_MIN_CACHE_SECONDS,
  },
  poweredByHeader: false,
  experimental: {
    agentFeedback: true,
  },
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    }

    const privateAreaHeaders = [
      { key: "Cache-Control", value: "no-store, max-age=0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/:area(user|admin|super-admin)/:path*", headers: privateAreaHeaders },
      { source: "/two-factor", headers: privateAreaHeaders },
    ];
  },
};

export default nextConfig;
