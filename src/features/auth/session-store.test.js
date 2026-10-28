import { afterEach, describe, expect, it, vi } from "vitest";

async function freshStore() {
  vi.resetModules();
  return import("./session-store.js");
}

function mockFetch(...responses) {
  const fn = vi.fn();
  responses.forEach((r) => fn.mockImplementationOnce(r));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body, ok = true) => async () => ({ ok, json: async () => body });

describe("auth session store", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports authenticated only when get-session returns a user", async () => {
    const store = await freshStore();
    mockFetch(json({ user: { email: "a@example.invalid" } }));
    await store.refreshSession();
    expect(store.useAuthSession).toBeTypeOf("function");
    mockFetch(json(null));
    await store.refreshSession();
  });

  it("signs out through the server and clears the user only on success", async () => {
    const store = await freshStore();
    store.markSignedIn({ email: "a@example.invalid" });
    const fetchFn = mockFetch(async () => ({ ok: true }));
    expect(await store.signOut()).toBe(true);
    expect(fetchFn.mock.calls[0][0]).toBe("/api/auth/sign-out");
    expect(fetchFn.mock.calls[0][1].method).toBe("POST");
  });

  it("keeps the user and reports failure when sign-out fails", async () => {
    const store = await freshStore();
    store.markSignedIn({ email: "a@example.invalid" });
    mockFetch(async () => ({ ok: false }));
    expect(await store.signOut()).toBe(false);
    mockFetch(async () => { throw new Error("network"); });
    expect(await store.signOut()).toBe(false);
  });

  it("ignores a duplicate sign-out while one is in flight", async () => {
    const store = await freshStore();
    store.markSignedIn({ email: "a@example.invalid" });
    let release;
    const fetchFn = mockFetch(() => new Promise((resolve) => { release = () => resolve({ ok: true }); }));
    const first = store.signOut();
    expect(await store.signOut()).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
