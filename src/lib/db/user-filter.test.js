import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { userIdFilter } from "./user-filter.js";

describe("userIdFilter", () => {
  it("matches an ObjectId _id as well as a stored id for adapter-issued ids", () => {
    const hex = "6ae26250f525a79a6e9404e4";
    const filter = userIdFilter(hex);
    expect(filter.$or[0]._id).toBeInstanceOf(ObjectId);
    expect(String(filter.$or[0]._id)).toBe(hex);
    expect(filter.$or[1]).toEqual({ id: hex });
  });

  it("falls back to the id field for other identifiers", () => {
    expect(userIdFilter("user-1")).toEqual({ id: "user-1" });
  });
});
