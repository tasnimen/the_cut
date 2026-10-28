/**
 * Prefer the public site origin in development so generated links point back
 * to the running Next.js app. Production can keep a dedicated auth origin.
 */
export function resolveAuthBaseUrl(environment) {
  const selected = environment.NODE_ENV === "development"
    ? environment.SITE_URL || environment.BETTER_AUTH_URL
    : environment.BETTER_AUTH_URL || environment.SITE_URL;
  if (!selected) throw new Error("Missing required server environment variable: BETTER_AUTH_URL");
  return selected;
}
