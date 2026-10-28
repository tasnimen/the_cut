import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter } from "./rate-limit-core.js";

describe("public endpoint rate limit behavior", () => {
  it("blocks a sixth request in-window and allows a request after the window expires", async () => {
    const limiter = createMemoryRateLimiter();
    const config = { key: "contact:hashed-ip", limit: 5, windowMs: 60_000 };
    for (let count = 0; count < 5; count += 1) {
      expect((await limiter.consume({ ...config, now: 10_000 + count * 1000 })).allowed).toBe(true);
    }
    expect((await limiter.consume({ ...config, now: 15_000 })).allowed).toBe(false);
    expect((await limiter.consume({ ...config, now: 75_000 })).allowed).toBe(true);
  });
});
