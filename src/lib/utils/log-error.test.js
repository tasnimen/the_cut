import { afterEach, describe, expect, it, vi } from "vitest";
import { describeError, logServerError } from "./log-error.js";

afterEach(() => vi.restoreAllMocks());

describe("safe error logging", () => {
  it("keeps the name, code, message and a short stack", () => {
    const error = Object.assign(new TypeError("boom"), { code: "E_BOOM" });
    const out = describeError(error);
    expect(out).toMatchObject({ name: "TypeError", code: "E_BOOM", message: "boom" });
    expect(out.stack.split(" | ").length).toBeLessThanOrEqual(6);
  });

  it("blanks out email addresses and phone numbers, and cuts long text", () => {
    const out = describeError(new Error("failed for sam@example.com and +1 (212) 555-0100 " + "x".repeat(2000)));
    expect(out.message).not.toMatch(/sam@example|555-0100/);
    expect(out.message).toContain("[email]");
    expect(out.message).toContain("[number]");
    expect(out.message.length).toBeLessThanOrEqual(400);
  });

  it("copes with things that are not errors", () => {
    for (const value of [null, undefined, "text", 5, {}]) expect(() => describeError(value)).not.toThrow();
    expect(describeError(null).name).toBe("Error");
  });

  it("writes exactly one console line that starts with the scope", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerError("walk-in", new Error("db down"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe("[walk-in] unexpected error");
    expect(spy.mock.calls[0][1]).toMatchObject({ name: "Error", message: "db down" });
  });
});
