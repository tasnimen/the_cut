import { describe, expect, it } from "vitest";
import { getCookies } from "better-auth/cookies";
import { getSessionCookieOptions } from "./cookies.js";

describe("Better Auth session cookie policy", () => {
  it("uses the secure host-only cookie attributes in production", () => {
    const { sessionToken } = getCookies({
      baseURL: "https://the-cut.example",
      advanced: getSessionCookieOptions(true),
    });

    expect(sessionToken.name.startsWith("__Host-")).toBe(true);
    expect(sessionToken.attributes).toMatchObject({ secure: true, httpOnly: true, sameSite: "lax", path: "/" });
    expect(sessionToken.attributes.domain).toBeUndefined();
  });

  it("uses a local non-secure name for HTTP development", () => {
    const { sessionToken } = getCookies({
      baseURL: "http://localhost:3000",
      advanced: getSessionCookieOptions(false),
    });

    expect(sessionToken.name).toBe("better-auth.session_token");
    expect(sessionToken.attributes).toMatchObject({ secure: false, httpOnly: true, sameSite: "lax", path: "/" });
  });
});
