import { z } from "zod";

// Customer account input and session display helpers (pure). The profile form only edits the
// display name; the email address is the sign-in identity and is not changed here.

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

const noControlChars = (value) => !/[\u0000-\u001f\u007f<>]/.test(value);

export const ProfileSchema = z.strictObject({
  name: z.string().trim().min(2, "Enter your name (at least 2 characters).").max(80, "Use 80 characters or fewer.").refine(noControlChars, "Remove special characters from your name."),
});

export const PasswordChangeSchema = z.strictObject({
  currentPassword: z.string().min(1, "Enter your current password.").max(PASSWORD_MAX),
  newPassword: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`).max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer.`),
  confirm: z.string(),
}).superRefine((value, ctx) => {
  if (value.newPassword !== value.confirm) ctx.addIssue({ code: "custom", path: ["confirm"], message: "The two passwords do not match." });
  if (value.newPassword === value.currentPassword) ctx.addIssue({ code: "custom", path: ["newPassword"], message: "Choose a password you have not used here before." });
});

export const SessionIdSchema = z.string().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/);

export function fieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// A short, readable device label from a user-agent string (no tracking, no full string shown).
export function describeDevice(userAgent) {
  const ua = String(userAgent || "");
  if (!ua) return "Unknown device";
  const browser = /edg\//i.test(ua) ? "Edge" : /opr\/|opera/i.test(ua) ? "Opera" : /firefox\//i.test(ua) ? "Firefox" : /chrome\//i.test(ua) ? "Chrome" : /safari\//i.test(ua) ? "Safari" : "Browser";
  const system = /windows/i.test(ua) ? "Windows" : /iphone|ipad/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /mac os x|macintosh/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "";
  return system ? `${browser} on ${system}` : browser;
}

// Maps Better Auth session rows to what the page may show. Never includes the session token.
// Sessions made before the last password/security change are hidden (they no longer work).
export function shapeSessions(rows, { currentSessionId, userVersion }) {
  return rows
    .filter((row) => Number(row.sessionVersion ?? 0) === Number(userVersion ?? 0))
    .map((row) => ({
      id: String(row.id),
      device: describeDevice(row.userAgent),
      createdAt: new Date(row.createdAt).toISOString(),
      expiresAt: new Date(row.expiresAt).toISOString(),
      current: String(row.id) === String(currentSessionId),
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) || b.createdAt.localeCompare(a.createdAt));
}

// Finds the token of one of the caller's own sessions; undefined when the id is not theirs.
export function tokenForOwnSession(rows, sessionId) {
  return rows.find((row) => String(row.id) === String(sessionId))?.token;
}
