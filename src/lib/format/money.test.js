import { describe, expect, it } from "vitest";
import { formatMoney } from "./money.js";

describe("formatMoney", () => {
  it("formats integer cents as USD", () => {
    expect(formatMoney(2500)).toBe("$25.00");
    expect(formatMoney(1500)).toBe("$15.00");
  });
});
