import { describe, expect, it } from "vitest";
import { TOAST_MESSAGES, toastKeyForStatus } from "./messages.js";

describe("toast messages", () => {
  it("has a valid type and text for every key", () => {
    for (const message of Object.values(TOAST_MESSAGES)) {
      expect(["success", "error", "info"]).toContain(message.type);
      expect(message.text.length).toBeGreaterThan(5);
    }
  });

  it("uses generic sign-in failure wording with no account enumeration", () => {
    expect(TOAST_MESSAGES.signInFailure.text).not.toMatch(/not found|no account|unknown|exists|verify/i);
  });

  it("maps rate limits and server errors consistently", () => {
    expect(toastKeyForStatus(429)).toBe("rateLimited");
    expect(toastKeyForStatus(503)).toBe("unexpected");
    expect(toastKeyForStatus(400, "bookingFailure")).toBe("bookingFailure");
  });
});
