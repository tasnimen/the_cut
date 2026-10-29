import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { buildCustomerQuery, customersQueryString, parseCustomerFilters, shapeCustomer } from "@/lib/customers/customers";
import { listCustomers } from "@/lib/customers/admin-customers";

describe("parseCustomerFilters / buildCustomerQuery", () => {
  it("cleans the search, accepts only the review flag and bounds the page", () => {
    expect(parseCustomerFilters({ q: " sam\u0000 ", flag: "review", page: "2" })).toEqual({ q: "sam", flag: "review", page: 2 });
    expect(parseCustomerFilters({ flag: "admin", page: "-1", q: { $ne: "" } })).toEqual({ q: "", flag: "", page: 1 });
    expect(parseCustomerFilters({ page: "99999" }).page).toBe(1000);
    expect(parseCustomerFilters({ q: "x".repeat(300) }).q).toHaveLength(60);
  });
  it("always restricts to customers and escapes the search", () => {
    expect(buildCustomerQuery({ q: "", flag: "", page: 1 })).toEqual({ role: "USER" });
    const query = buildCustomerQuery({ q: "a.b(", flag: "review", page: 1 });
    expect(query.role).toBe("USER");
    expect(query.adminReviewRequired).toBe(true);
    expect(query.$or[0].name.$regex).toBe("a\\.b\\(");
    expect(query.$or[1].email.$regex).toBe("a\\.b\\(");
  });
  it("builds query strings without empty values", () => {
    expect(customersQueryString({ q: "sam", flag: "", page: 1 }, { page: 2 })).toBe("?q=sam&page=2");
    expect(customersQueryString({ q: "", flag: "", page: 1 })).toBe("");
  });
});

describe("shapeCustomer", () => {
  it("returns only the limited fields", () => {
    const customer = shapeCustomer(
      { _id: new ObjectId("a".repeat(24)), name: "Sam", email: "sam@example.com", createdAt: new Date("2026-10-01T00:00:00Z"), status: "ACTIVE", passwordHash: "secret", role: "USER", noShowCount: 2, adminReviewRequired: true },
      { total: 5, completed: 3, lastCompleted: new Date("2026-10-20T15:00:00Z") },
      { requestedAt: new Date("2026-10-25T00:00:00Z") },
    );
    expect(customer).toEqual({
      id: "a".repeat(24), name: "Sam", email: "sam@example.com", joinedAt: "2026-10-01T00:00:00.000Z", suspended: false,
      bookings: 5, completed: 3, noShows: 2, lastVisit: "2026-10-20T15:00:00.000Z", needsReview: true, deletionRequestedAt: "2026-10-25T00:00:00.000Z",
    });
    expect(JSON.stringify(customer)).not.toMatch(/secret|passwordHash|role/);
  });
  it("handles missing names, stats and flags", () => {
    expect(shapeCustomer({ _id: "1", email: "x@y.z" })).toMatchObject({ name: "(no name)", bookings: 0, lastVisit: null, needsReview: false, deletionRequestedAt: null, suspended: false });
    expect(shapeCustomer({ _id: "1", email: "x@y.z", status: "SUSPENDED" }).suspended).toBe(true);
  });
});

describe("listCustomers", () => {
  it("loads one page, asks only for limited fields and joins statistics and deletion requests by user id", async () => {
    const id = new ObjectId();
    const calls = { projection: null, query: null, pipeline: null };
    const cursor = (rows) => ({ sort: () => cursor(rows), skip: () => cursor(rows), limit: () => cursor(rows), toArray: async () => rows });
    const db = { collection: (name) => ({
      countDocuments: async (query) => { calls.query = query; return 30; },
      find: (query, options) => {
        if (name === "user") { calls.projection = options.projection; return cursor([{ _id: id, name: "Sam", email: "sam@example.com", createdAt: new Date("2026-10-01") }]); }
        return cursor([{ userId: String(id), requestedAt: new Date("2026-10-25") }]);
      },
      aggregate: (pipeline) => { calls.pipeline = pipeline; return cursor([{ _id: String(id), total: 4, completed: 2, noShow: 0, lastCompleted: new Date("2026-10-10") }]); },
    }) };
    const result = await listCustomers(db, { q: "", flag: "", page: 1 });
    expect(calls.query).toEqual({ role: "USER" });
    expect(Object.keys(calls.projection).sort()).toEqual(["adminReviewRequired", "createdAt", "email", "name", "noShowCount", "status"]);
    expect(calls.pipeline[0].$match.userId.$in).toEqual([String(id)]);
    expect(result).toMatchObject({ total: 30, pages: 2, page: 1 });
    expect(result.customers[0]).toMatchObject({ name: "Sam", bookings: 4, completed: 2, deletionRequestedAt: "2026-10-25T00:00:00.000Z" });
  });
  it("skips the statistics queries on an empty page", async () => {
    const aggregate = vi.fn();
    const cursor = { sort: () => cursor, skip: () => cursor, limit: () => cursor, toArray: async () => [] };
    const db = { collection: () => ({ countDocuments: async () => 0, find: () => cursor, aggregate }) };
    const result = await listCustomers(db, { q: "zzz", flag: "", page: 1 });
    expect(result).toMatchObject({ customers: [], total: 0, pages: 1 });
    expect(aggregate).not.toHaveBeenCalled();
  });
});
