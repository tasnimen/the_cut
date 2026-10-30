import { describe, expect, it } from "vitest";
import { UPLOAD_MAX_BYTES, UPLOAD_TOAST_KEYS, checkChosenFile, cropRect, fitWithin, uploadFailureKind } from "./client-upload.js";
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

describe("cropRect", () => {
  it("cuts a wide picture to 4:3, keeping the chosen part", () => {
    expect(cropRect(2000, 1000, 4 / 3)).toEqual({ x: 334, y: 0, width: 1333, height: 1000 });
    expect(cropRect(2000, 1000, 4 / 3, 0, 0.5).x).toBe(0);
    expect(cropRect(2000, 1000, 4 / 3, 1, 0.5).x).toBe(667);
  });
  it("cuts a tall picture to 4:5 and never goes outside the picture", () => {
    const crop = cropRect(1000, 2000, 4 / 5, 0.5, 1);
    expect(crop).toEqual({ x: 0, y: 750, width: 1000, height: 1250 });
    for (const focus of [-5, 0, 0.3, 1, 9, NaN]) {
      const rect = cropRect(1234, 987, 4 / 3, focus, focus);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(1234);
      expect(rect.y + rect.height).toBeLessThanOrEqual(987);
    }
  });
  it("keeps the ratio (within a pixel) and leaves matching pictures alone", () => {
    const rect = cropRect(3000, 2000, 4 / 5);
    expect(Math.abs(rect.width / rect.height - 4 / 5)).toBeLessThan(0.001);
    expect(cropRect(800, 600, 4 / 3)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    expect(cropRect(0, 0, 4 / 3)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
});
