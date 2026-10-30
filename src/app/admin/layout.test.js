import { beforeEach, describe, expect, it, vi } from "vitest";

// The admin layout refuses a revoked page before anything streams, so the browser gets a real HTTP 404.
const mocks = vi.hoisted(() => ({ guard: vi.fn(), path: { current: null } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(mocks.path.current ? { "x-pathname": mocks.path.current } : {}) }));
vi.mock("@/lib/auth/dashboard-guard", () => ({ requireDashboardAccess: mocks.guard }));
vi.mock("@/lib/auth/capabilities", () => ({ effectiveCapabilities: async () => ({}) }));
vi.mock("@/features/dashboard/components/DashboardShell", () => ({ DashboardShell: () => null }));

const { default: Layout } = await import("./layout.jsx");

beforeEach(() => { mocks.guard.mockReset(); mocks.guard.mockResolvedValue({ id: "u1", role: "ADMIN" }); });

describe("admin layout", () => {
  it("passes the page's switch to the guard for a switch-controlled page", async () => {
    mocks.path.current = "/admin/barbers/daniel-carter";
    await Layout({ children: null });
    expect(mocks.guard).toHaveBeenCalledWith("admin", { capability: "barbers.edit" });
  });
  it("passes no switch for the overview, or when the path is missing (pages still check themselves)", async () => {
    for (const path of ["/admin", null]) {
      mocks.guard.mockClear();
      mocks.path.current = path;
      await Layout({ children: null });
      expect(mocks.guard).toHaveBeenCalledWith("admin", { capability: undefined });
    }
  });
  it("lets the guard refuse the request: a thrown not-found stops the layout", async () => {
    mocks.path.current = "/admin/settings";
    mocks.guard.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(Layout({ children: null })).rejects.toThrow("NOT_FOUND");
  });
});
