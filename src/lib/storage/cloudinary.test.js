import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CLOUDINARY_FOLDERS, StorageError, createCloudinaryStorage, signParams } from "./cloudinary.js";
import { assertStorageEnv, missingStorageEnv } from "./storage-env.js";

const SECRET = "test-secret-DO-NOT-LEAK";
const CONFIG = { cloudName: "demo-cloud", apiKey: "123456789012345", apiSecret: SECRET };
const ID = "11111111-2222-3333-4444-555555555555";

function mockFetch(responder) {
  const calls = [];
  const fetchImpl = vi.fn(async (url, init) => {
    const fields = {};
    for (const [key, value] of init.body.entries()) fields[key] = typeof value === "string" ? value : "[file]";
    calls.push({ url: String(url), fields, init });
    return responder(String(url), fields);
  });
  return { fetchImpl, calls };
}
const ok = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

function uploadReply(overrides = {}) {
  return ok({ public_id: `the-cut/gallery/${ID}`, secure_url: `https://res.cloudinary.com/demo-cloud/image/upload/v1/the-cut/gallery/${ID}.webp`, width: 1200, height: 800, format: "webp", bytes: 51234, ...overrides });
}

describe("signParams", () => {
  it("is deterministic, sorts keys, ignores empty values and appends the secret", () => {
    const expected = createHash("sha1").update("overwrite=false&public_id=the-cut/gallery/x&timestamp=1700000000" + SECRET).digest("hex");
    expect(signParams({ timestamp: 1700000000, public_id: "the-cut/gallery/x", overwrite: "false", skipped: "", missing: undefined }, SECRET)).toBe(expected);
    expect(signParams({ overwrite: "false", timestamp: 1700000000, public_id: "the-cut/gallery/x" }, SECRET)).toBe(expected);
  });
  it("never contains the secret and changes with it", () => {
    const signature = signParams({ timestamp: 1 }, SECRET);
    expect(signature).toMatch(/^[a-f0-9]{40}$/);
    expect(signature).not.toContain(SECRET);
    expect(signParams({ timestamp: 1 }, "another-secret")).not.toBe(signature);
  });
  it("refuses to sign without a secret", () => {
    expect(() => signParams({ timestamp: 1 }, "")).toThrowError(StorageError);
  });
});

describe("createCloudinaryStorage", () => {
  it("needs all three settings", () => {
    expect(() => createCloudinaryStorage({ cloudName: "a", apiKey: "b" })).toThrowError(expect.objectContaining({ code: "missing_storage_configuration" }));
  });

  it("uploads signed to a fixed folder with a random id, overwrite off, and never sends the secret", async () => {
    const { fetchImpl, calls } = mockFetch(() => uploadReply());
    const storage = createCloudinaryStorage({ ...CONFIG, fetchImpl, now: () => 1_700_000_000_000, makeId: () => ID });
    const result = await storage.upload({ bytes: Buffer.from("webp"), folder: CLOUDINARY_FOLDERS.gallery });

    expect(calls[0].url).toBe("https://api.cloudinary.com/v1_1/demo-cloud/image/upload");
    const sent = calls[0].fields;
    expect(sent).toMatchObject({ public_id: `the-cut/gallery/${ID}`, overwrite: "false", timestamp: "1700000000", api_key: CONFIG.apiKey, file: "[file]" });
    expect(sent.signature).toBe(signParams({ public_id: `the-cut/gallery/${ID}`, overwrite: "false", timestamp: 1700000000 }, SECRET));
    expect(JSON.stringify(sent)).not.toContain(SECRET);
    expect(calls[0].init.redirect).toBe("error");
    expect(result).toEqual({ provider: "cloudinary", publicId: `the-cut/gallery/${ID}`, resourceType: "image", secureUrl: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\/demo-cloud\//), width: 1200, height: 800, format: "webp", bytes: 51234, folder: "the-cut/gallery" });
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });

  it("only accepts the fixed folders", async () => {
    const { fetchImpl } = mockFetch(() => uploadReply());
    const storage = createCloudinaryStorage({ ...CONFIG, fetchImpl });
    for (const folder of ["the-cut/../secret", "other/gallery", "the-cut/gallery/extra", "", undefined]) {
      await expect(storage.upload({ bytes: Buffer.from("x"), folder })).rejects.toMatchObject({ code: "invalid_folder" });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps provider failures to safe codes that contain no secret", async () => {
    for (const [status, code] of [[401, "provider_rejected_credentials"], [403, "provider_rejected_credentials"], [500, "provider_error"]]) {
      const { fetchImpl } = mockFetch(() => ok({ error: { message: `bad key for ${SECRET}` } }, status));
      const failure = await createCloudinaryStorage({ ...CONFIG, fetchImpl }).upload({ bytes: Buffer.from("x"), folder: CLOUDINARY_FOLDERS.avatar }).catch((error) => error);
      expect(failure.code).toBe(code);
      expect(`${failure.message} ${failure.stack}`).not.toContain(SECRET);
    }
    const network = createCloudinaryStorage({ ...CONFIG, fetchImpl: async () => { throw new Error(`down ${SECRET}`); } });
    const error = await network.upload({ bytes: Buffer.from("x"), folder: CLOUDINARY_FOLDERS.avatar }).catch((e) => e);
    expect(error.code).toBe("provider_unreachable");
    expect(error.message).not.toContain(SECRET);
  });

  it("rejects a response that points somewhere else or changes the id", async () => {
    for (const reply of [{ secure_url: "https://evil.example/demo-cloud/x.webp" }, { secure_url: "https://res.cloudinary.com/other-cloud/image/upload/x.webp" }, { public_id: "the-cut/gallery/another-id-12345" }, { secure_url: "http://res.cloudinary.com/demo-cloud/x.webp" }]) {
      const { fetchImpl } = mockFetch(() => uploadReply(reply));
      const storage = createCloudinaryStorage({ ...CONFIG, fetchImpl, makeId: () => ID });
      await expect(storage.upload({ bytes: Buffer.from("x"), folder: CLOUDINARY_FOLDERS.gallery })).rejects.toMatchObject({ code: "invalid_provider_response" });
    }
  });

  it("deletes by public id with a signature, and treats a missing file as deleted", async () => {
    const { fetchImpl, calls } = mockFetch(() => ok({ result: "ok" }));
    const storage = createCloudinaryStorage({ ...CONFIG, fetchImpl, now: () => 1_700_000_000_000 });
    await expect(storage.delete({ publicId: `the-cut/gallery/${ID}` })).resolves.toBe(true);
    expect(calls[0].url).toBe("https://api.cloudinary.com/v1_1/demo-cloud/image/destroy");
    expect(calls[0].fields).toMatchObject({ public_id: `the-cut/gallery/${ID}`, invalidate: "true", timestamp: "1700000000", api_key: CONFIG.apiKey });
    expect(calls[0].fields.signature).toBe(signParams({ public_id: `the-cut/gallery/${ID}`, invalidate: "true", timestamp: 1700000000 }, SECRET));
    expect(JSON.stringify(calls[0].fields)).not.toContain(SECRET);

    const missing = createCloudinaryStorage({ ...CONFIG, fetchImpl: mockFetch(() => ok({ result: "not found" })).fetchImpl });
    await expect(missing.delete({ publicId: `the-cut/gallery/${ID}` })).resolves.toBe(true);
    const refused = createCloudinaryStorage({ ...CONFIG, fetchImpl: mockFetch(() => ok({ result: "error" })).fetchImpl });
    await expect(refused.delete({ publicId: `the-cut/gallery/${ID}` })).rejects.toMatchObject({ code: "provider_error" });
  });

  it("refuses to delete anything that is not one of our public ids", async () => {
    const { fetchImpl } = mockFetch(() => ok({ result: "ok" }));
    const storage = createCloudinaryStorage({ ...CONFIG, fetchImpl });
    for (const publicId of ["sample", "the-cut/../x", "../the-cut/gallery/abc12345", "the-cut/gallery/a/b", undefined, "the-cut/gallery/short"]) {
      await expect(storage.delete({ publicId })).rejects.toMatchObject({ code: "invalid_public_id" });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("storage environment", () => {
  it("names the missing variables and never a value", () => {
    expect(missingStorageEnv({})).toEqual(["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]);
    expect(missingStorageEnv({ STORAGE_PROVIDER: "cloudinary", CLOUDINARY_CLOUD_NAME: "x", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "" })).toEqual(["CLOUDINARY_API_SECRET"]);
    expect(missingStorageEnv({ CLOUDINARY_CLOUD_NAME: "x", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s" })).toEqual([]);
    expect(missingStorageEnv({ STORAGE_PROVIDER: "imgbb" })).toEqual(["IMGBB_API_KEY"]);
    expect(missingStorageEnv({ STORAGE_PROVIDER: "imgbb", IMGBB_API_KEY: "k" })).toEqual([]);
    expect(() => assertStorageEnv({ CLOUDINARY_API_KEY: "k-visible-value" })).toThrowError(/CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_SECRET/);
    expect(() => assertStorageEnv({ CLOUDINARY_API_KEY: "k-visible-value" })).not.toThrowError(/k-visible-value/);
    expect(() => assertStorageEnv({ CLOUDINARY_CLOUD_NAME: "a", CLOUDINARY_API_KEY: "b", CLOUDINARY_API_SECRET: "c" })).not.toThrow();
  });
});
