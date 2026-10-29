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

import { emailVerificationAuthOptions } from "./verification-policy.js";

describe("emailVerificationAuthOptions", () => {
  it("sends and requires nothing when the flag is off", () => {
    expect(emailVerificationAuthOptions(false)).toEqual({
      emailAndPassword: { enabled: true, requireEmailVerification: false },
      emailVerification: { sendOnSignUp: false, sendOnSignIn: false },
    });
  });

  it("restores the verification flow when the flag is on", () => {
    expect(emailVerificationAuthOptions(true)).toEqual({
      emailAndPassword: { enabled: true, requireEmailVerification: true },
      emailVerification: { sendOnSignUp: true, sendOnSignIn: true },
    });
  });
});
