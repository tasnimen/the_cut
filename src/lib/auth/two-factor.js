// Pure helpers for the TOTP enrolment and challenge screens (no network, no secrets stored).

// Reads the shared secret out of an otpauth:// URI so it can be shown for manual entry.
export function parseTotpSecret(totpURI) {
  try {
    const secret = new URL(totpURI).searchParams.get("secret");
    return secret && /^[A-Za-z2-7]+=*$/.test(secret) ? secret.toUpperCase().replace(/=+$/, "") : null;
  } catch {
    return null;
  }
}

// "ABCDEFGHIJKLMNOP" -> "ABCD EFGH IJKL MNOP" for easier typing.
export function formatSecret(secret) {
  return typeof secret === "string" ? secret.replace(/(.{4})/g, "$1 ").trim() : "";
}

export function normalizeTotpCode(value) {
  return typeof value === "string" ? value.replace(/\s+/g, "") : "";
}

export function isValidTotpCode(value) {
  return /^\d{6}$/.test(normalizeTotpCode(value));
}

export function normalizeBackupCode(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidBackupCode(value) {
  const code = normalizeBackupCode(value);
  return code.length >= 6 && code.length <= 64 && /^[A-Za-z0-9-]+$/.test(code);
}

// Maps a failed two-factor response to a user-facing message key without revealing details.
export function twoFactorFailureKey(status) {
  if (status === 429) return "rateLimited";
  if (status >= 500) return "unexpected";
  return "twoFactorInvalid";
}
