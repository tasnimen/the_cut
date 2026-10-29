import { describe, expect, it } from "vitest";
import { formatSecret, isValidBackupCode, isValidTotpCode, normalizeTotpCode, parseTotpSecret, twoFactorFailureKey } from "./two-factor.js";

describe("two-factor helpers", () => {
  it("reads the setup key from an otpauth URI and rejects anything else", () => {
    expect(parseTotpSecret("otpauth://totp/The%20Cut:a@b.c?secret=JBSWY3DPEHPK3PXP&issuer=The%20Cut")).toBe("JBSWY3DPEHPK3PXP");
    expect(parseTotpSecret("otpauth://totp/x?secret=not*base32")).toBeNull();
    expect(parseTotpSecret("otpauth://totp/x")).toBeNull();
    expect(parseTotpSecret("garbage")).toBeNull();
    expect(parseTotpSecret(undefined)).toBeNull();
  });

  it("groups the key for typing", () => {
    expect(formatSecret("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
    expect(formatSecret(null)).toBe("");
  });

  it("validates codes after stripping spaces", () => {
    expect(normalizeTotpCode(" 123 456 ")).toBe("123456");
    expect(isValidTotpCode("123 456")).toBe(true);
    expect(isValidTotpCode("12345")).toBe(false);
    expect(isValidTotpCode("12345a")).toBe(false);
    expect(isValidBackupCode("abcd-1234-efgh")).toBe(true);
    expect(isValidBackupCode("short")).toBe(false);
    expect(isValidBackupCode("bad code!")).toBe(false);
  });

  it("maps failures without leaking detail", () => {
    expect(twoFactorFailureKey(429)).toBe("rateLimited");
    expect(twoFactorFailureKey(500)).toBe("unexpected");
    expect(twoFactorFailureKey(401)).toBe("twoFactorInvalid");
    expect(twoFactorFailureKey(400)).toBe("twoFactorInvalid");
  });
});
