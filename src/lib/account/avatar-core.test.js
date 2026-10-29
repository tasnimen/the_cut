import { describe, expect, it, vi } from "vitest";
import { AVATAR_ALT, createAvatarService } from "@/lib/account/avatar-core";
import { cancelDeletionRequest, confirmationMatches, getDeletionRequest, requestDeletion } from "@/lib/account/deletion-request";

const principal = { id: "u1", role: "USER" };

function setup(existing = []) {
  const records = [...existing];
  const media = {
    upload: vi.fn(async () => { records.push({ _id: "new", ownerId: "u1", category: "avatar" }); return { id: "new", displayUrl: "https://i.ibb.co/x/new.webp" }; }),
    delete: vi.fn(async ({ record }) => { records.splice(records.findIndex((r) => r._id === record._id), 1); }),
  };
  const setImage = vi.fn(async () => {});
  const audit = vi.fn(async () => {});
  const service = createAvatarService({ media, listOwn: async () => [...records], setImage, audit });
  return { service, media, setImage, audit, records };
}

describe("avatar service", () => {
  it("uploads, sets the image and removes older avatars", async () => {
    const { service, media, setImage, records, audit } = setup([{ _id: "old", ownerId: "u1", category: "avatar" }]);
    const result = await service.replace({ principal, file: {}, alt: "x" });
    expect(result.url).toBe("https://i.ibb.co/x/new.webp");
    expect(setImage).toHaveBeenCalledWith("u1", "https://i.ibb.co/x/new.webp");
    expect(records.map((r) => r._id)).toEqual(["new"]);
    expect(media.delete).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(principal, "account.avatar.updated");
  });

  it("rolls back the new upload when the user cannot be updated", async () => {
    const { service, setImage, records } = setup([{ _id: "old", ownerId: "u1", category: "avatar" }]);
    setImage.mockRejectedValue(new Error("db"));
    await expect(service.replace({ principal, file: {}, alt: "x" })).rejects.toThrow("db");
    expect(records.map((r) => r._id)).toEqual(["old"]);
  });

  it("never deletes records that are not the caller's own avatars", async () => {
    const { service, media } = setup([{ _id: "theirs", ownerId: "u2", category: "avatar" }, { _id: "gallery", ownerId: "u1", category: "gallery" }]);
    await service.replace({ principal, file: {}, alt: "x" });
    expect(media.delete).not.toHaveBeenCalled();
  });

  it("removes the photo and every avatar record", async () => {
    const { service, setImage, records } = setup([{ _id: "a", ownerId: "u1", category: "avatar" }, { _id: "b", ownerId: "u1", category: "avatar" }]);
    await service.remove({ principal });
    expect(setImage).toHaveBeenCalledWith("u1", null);
    expect(records).toEqual([]);
  });

  it("builds a safe alt text", () => {
    expect(AVATAR_ALT("Sam")).toBe("Sam profile photo");
    expect(AVATAR_ALT("")).toBe("Customer profile photo");
  });
});

describe("deletion requests", () => {
  function fakeDb() {
    const docs = new Map();
    return { docs, collection: () => ({
      findOne: async (filter) => { const d = docs.get(filter.userId); return d && d.status === filter.status ? d : null; },
      updateOne: async (filter, update, options) => {
        const existing = docs.get(filter.userId);
        if (!existing) {
          if (!options?.upsert) return { modifiedCount: 0, upsertedCount: 0 };
          docs.set(filter.userId, { ...update.$set, ...update.$setOnInsert });
          return { modifiedCount: 0, upsertedCount: 1 };
        }
        if (filter.status && existing.status !== filter.status) return { modifiedCount: 0, upsertedCount: 0 };
        Object.assign(existing, update.$set);
        return { modifiedCount: 1, upsertedCount: 0 };
      },
    }) };
  }

  it("matches the typed email case-insensitively and rejects blanks", () => {
    expect(confirmationMatches(" Sam@Example.com ", "sam@example.com")).toBe(true);
    expect(confirmationMatches("other@example.com", "sam@example.com")).toBe(false);
    expect(confirmationMatches("", "")).toBe(false);
  });

  it("records, reads and cancels one request per user", async () => {
    const db = fakeDb();
    expect(await getDeletionRequest(db, "u1")).toBeNull();
    await requestDeletion(db, { userId: "u1", email: "a@b.c" }, new Date("2026-10-29T10:00:00Z"));
    expect((await getDeletionRequest(db, "u1")).requestedAt).toBe("2026-10-29T10:00:00.000Z");
    expect((await cancelDeletionRequest(db, "u1")).cancelled).toBe(true);
    expect(await getDeletionRequest(db, "u1")).toBeNull();
    expect((await cancelDeletionRequest(db, "u1")).cancelled).toBe(false);
  });
});
