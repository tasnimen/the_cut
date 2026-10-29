import { describe, expect, it } from "vitest";
import { safeCallbackPath, signInUrlFor } from "./callback.js";

describe("safeCallbackPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeCallbackPath("/booking")).toBe("/booking");
    expect(safeCallbackPath("/booking?step=2#form")).toBe("/booking?step=2#form");
  });

  it("rejects external, protocol-relative, backslash, control-character and loop targets", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/" + String.fromCharCode(92) + "evil.example","javascript:alert(1)", "booking", "/a\nb", "/sign-in", "/sign-up?x=1", "/api/auth/sign-out", "", null, undefined, 5, "/" + "a".repeat(600)]) {
      expect(safeCallbackPath(bad, "/")).toBe("/");
    }
  });

  it("builds an encoded sign-in URL", () => {
    expect(signInUrlFor("/booking")).toBe("/sign-in?callbackUrl=%2Fbooking");
    expect(signInUrlFor("https://evil.example")).toBe("/sign-in?callbackUrl=%2F");
  });
});
