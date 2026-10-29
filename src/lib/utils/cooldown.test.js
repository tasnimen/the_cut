import { describe, expect, it } from "vitest";
import { createCooldown } from "./cooldown.js";

describe("createCooldown", () => {
  it("skips the loader for the cooldown period after a failure, then retries", async () => {
    let time = 1000;
    let calls = 0;
    const run = createCooldown({ ms: 30_000, now: () => time });
    const failing = async () => { calls += 1; throw new Error("down"); };
    await expect(run(failing)).rejects.toThrow("down");
    await expect(run(failing)).rejects.toThrow(/cooling down/);
    expect(calls).toBe(1);
    time += 30_001;
    await expect(run(async () => "ok")).resolves.toBe("ok");
    expect(calls).toBe(1);
  });

  it("does not delay after successes", async () => {
    const run = createCooldown({ ms: 30_000, now: () => 0 });
    await expect(run(async () => 1)).resolves.toBe(1);
    await expect(run(async () => 2)).resolves.toBe(2);
  });
});
