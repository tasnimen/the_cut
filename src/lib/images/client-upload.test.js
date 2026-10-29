import { describe, expect, it } from "vitest";
import { UPLOAD_MAX_BYTES, UPLOAD_TOAST_KEYS, checkChosenFile, fitWithin, uploadFailureKind } from "./client-upload.js";
import { TOAST_MESSAGES } from "../toast/messages.js";

describe("fitWithin", () => {
  it("shrinks to 2000 px on the long side, keeps the ratio and never enlarges", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000)).toEqual({ width: 1000, height: 2000 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1, 5000)).toEqual({ width: 1, height: 2000 });
    expect(fitWithin(0, 0)).toEqual({ width: 1, height: 1 });
  });
});

describe("checkChosenFile", () => {
  it("accepts the four image types and refuses everything else", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/avif"]) expect(checkChosenFile({ size: 10, type })).toBeNull();
    for (const file of [{ size: 10, type: "application/x-msdownload" }, { size: 10, type: "image/gif" }, { size: 10, type: "" }, { size: 0, type: "image/png" }, null, "string"]) {
      expect(checkChosenFile(file)).toBe("wrong_type");
    }
  });
  it("uses the same 4 MB limit as the server", () => {
    expect(UPLOAD_MAX_BYTES).toBe(4 * 1024 * 1024);
  });
});

describe("uploadFailureKind and toasts", () => {
  it("maps statuses to one clear message each", () => {
    expect(uploadFailureKind(413)).toBe("too_large");
    expect(uploadFailureKind(429)).toBe("rate_limited");
    expect(uploadFailureKind(401)).toBe("denied");
    expect(uploadFailureKind(403)).toBe("denied");
    expect(uploadFailureKind(400)).toBe("wrong_type");
    expect(uploadFailureKind(400, { hasFieldErrors: true })).toBe("provider_error");
    expect(uploadFailureKind(500)).toBe("provider_error");
    expect(uploadFailureKind(502)).toBe("provider_error");
  });
  it("has a toast message for every kind", () => {
    for (const key of Object.values(UPLOAD_TOAST_KEYS)) expect(TOAST_MESSAGES[key], key).toBeTruthy();
  });
});
