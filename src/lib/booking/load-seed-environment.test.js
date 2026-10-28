import { describe, expect, it, vi } from "vitest";
import nextEnv from "@next/env";
import { loadSeedEnvironment } from "@/lib/booking/load-seed-environment";

describe("booking seed environment initialization", () => {
  it("uses the CommonJS default export and loads development env files in development", () => {
    expect(typeof nextEnv.loadEnvConfig).toBe("function");
    const loader = vi.fn();

    loadSeedEnvironment("D:/project", "development", loader);

    expect(loader).toHaveBeenCalledWith("D:/project", true);
  });

  it("does not load development env files for other modes", () => {
    const loader = vi.fn();

    loadSeedEnvironment("D:/project", "production", loader);

    expect(loader).toHaveBeenCalledWith("D:/project", false);
  });
});
