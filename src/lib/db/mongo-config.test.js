import { describe, expect, it } from "vitest";
import { createConfiguredMongoClient, MONGO_CLIENT_OPTIONS } from "@/lib/db/mongo-config";

describe("configured Mongo client options", () => {
  it("preserves application defaults and supports bounded seed-specific overrides", async () => {
    const appClient = createConfiguredMongoClient("mongodb://localhost:27017/the_cut");
    const seedClient = createConfiguredMongoClient("mongodb://localhost:27017/the_cut", {
      connectTimeoutMS: 5_000,
      serverSelectionTimeoutMS: 8_000,
      socketTimeoutMS: 12_000,
      timeoutMS: 15_000,
    });

    expect(appClient.options.serverSelectionTimeoutMS).toBe(MONGO_CLIENT_OPTIONS.serverSelectionTimeoutMS);
    expect(appClient.options.connectTimeoutMS).not.toBe(5_000);
    expect(seedClient.options).toMatchObject({
      ...MONGO_CLIENT_OPTIONS,
      connectTimeoutMS: 5_000,
      serverSelectionTimeoutMS: 8_000,
      socketTimeoutMS: 12_000,
      timeoutMS: 15_000,
    });

    await Promise.all([appClient.close(), seedClient.close()]);
  });
});
