// Accepts only same-origin, absolute-path callbacks. Anything else falls back,
// so a crafted ?callbackUrl= can never become an open redirect.
const AUTH_PATH = /^\/(sign-in|sign-up)(\/|\?|#|$)/;

export function safeCallbackPath(value, fallback = "/") {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (path.length === 0 || path.length > 512) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;
  if (AUTH_PATH.test(path) || path.startsWith("/api/")) return fallback;
  return path;
}

export function signInUrlFor(path) {
  return `/sign-in?callbackUrl=${encodeURIComponent(safeCallbackPath(path))}`;
}
