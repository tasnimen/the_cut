import "server-only";
import { env } from "@/config/env";

export async function verifyContactCaptcha({ token, remoteIp, fetchImpl = fetch }) {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return { enabled: false, valid: !token };
  if (!token) return { enabled: true, valid: false };

  try {
    const formData = new FormData();
    formData.set("secret", secret);
    formData.set("response", token);
    if (remoteIp) formData.set("remoteip", remoteIp);
    const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      redirect: "error",
    });
    if (!response.ok) return { enabled: true, valid: false };
    const result = await response.json();
    const allowedHostnames = [env.SITE_URL, env.BETTER_AUTH_URL].filter(Boolean).map((url) => new URL(url).hostname);
    const hostnameValid = !allowedHostnames.length || allowedHostnames.includes(result.hostname);
    return { enabled: true, valid: result.success === true && hostnameValid };
  } catch {
    return { enabled: true, valid: false };
  }
}
