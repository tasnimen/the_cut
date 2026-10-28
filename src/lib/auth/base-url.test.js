import { describe, expect, it } from "vitest";
import { resolveAuthBaseUrl } from "./base-url.js";

describe("auth base URL selection", () => {
  it("uses the server SITE_URL for development verification links", () => {
    expect(resolveAuthBaseUrl({
      NODE_ENV: "development",
      SITE_URL: "http://localhost:3000",
      BETTER_AUTH_URL: "http://localhost:2000",
    })).toBe("http://localhost:3000");
  });

  it("keeps a dedicated Better Auth origin in production", () => {
    expect(resolveAuthBaseUrl({
      NODE_ENV: "production",
      SITE_URL: "https://cut.example.test",
      BETTER_AUTH_URL: "https://auth.example.test",
    })).toBe("https://auth.example.test");
  });
});
