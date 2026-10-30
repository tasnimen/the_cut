import { NextResponse } from "next/server";

// Browsers may load images only from this site and our image host. The cloud name (not a secret) narrows
// Cloudinary to our own folder tree. ImgBB stays only for older images (docs/DECISIONS.md).
const CLOUD_NAME = /^[A-Za-z0-9_-]{2,64}$/.test(process.env.CLOUDINARY_CLOUD_NAME ?? "") ? process.env.CLOUDINARY_CLOUD_NAME : null;
const CLOUDINARY_IMG_SOURCE = CLOUD_NAME ? `https://res.cloudinary.com/${CLOUD_NAME}/` : "https://res.cloudinary.com";

export function proxy(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-elem ${isDevelopment ? "'self' 'unsafe-inline'" : `'self' 'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: blob: ${CLOUDINARY_IMG_SOURCE} https://i.ibb.co`,
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!isDevelopment ? ["upgrade-insecure-requests"] : []),
  ];
  const contentSecurityPolicy = directives.join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", request.nextUrl.pathname); // always set here, so a client-sent value is overwritten
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
