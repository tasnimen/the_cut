import { describe, expect, it } from "vitest";
import { isEmailVerificationSatisfied } from "./verification-policy.js";

describe("email verification policy", () => {
  it("does not require verification when the flag is off", () => {
    expect(isEmailVerificationSatisfied({ emailVerified: false }, false)).toBe(true);
    expect(isEmailVerificationSatisfied({}, false)).toBe(true);
  });

  it("requires a verified address when the flag is on", () => {
    expect(isEmailVerificationSatisfied({ emailVerified: false }, true)).toBe(false);
    expect(isEmailVerificationSatisfied(undefined, true)).toBe(false);
    expect(isEmailVerificationSatisfied({ emailVerified: true }, true)).toBe(true);
  });
});
