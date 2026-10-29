/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [new URL("https://i.ibb.co/**")],
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
    ];
  },
};

export default nextConfig;
