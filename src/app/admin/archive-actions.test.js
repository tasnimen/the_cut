import { beforeEach, describe, expect, it, vi } from "vitest";

// Archive and restore Server Actions (unit D2a): each one re-checks the session and its own Super Admin switch,
// validates the slug, and only then touches the repository.
const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), consume: vi.fn(), revalidate: vi.fn(), archive: vi.fn(), restore: vi.fn() }));
class AuthorizationError extends Error { constructor(status = 403) { super("denied"); this.status = status; } }

vi.mock("@/lib/auth/authorization", () => ({ requirePrincipal: mocks.requirePrincipal, AuthorizationError }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.consume }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: {} }), ensureApplicationIndexes: vi.fn() }));
vi.mock("@/lib/catalog/revalidate", () => ({ revalidateCatalog: mocks.revalidate }));
vi.mock("@/lib/catalog/image-action", () => ({ PICTURE_FAILED_MESSAGE: "x", readPicture: vi.fn(), savePicture: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/catalog/archive", async (importOriginal) => ({ ...(await importOriginal()), archiveRecord: mocks.archive, restoreRecord: mocks.restore }));

const services = await import("./services/actions.js");
const packages = await import("./packages/actions.js");
const barbers = await import("./barbers/actions.js");

const CASES = [
  { kind: "services", permission: "servicesManageAll", archive: services.archiveServiceAction, restore: services.restoreServiceAction },
  { kind: "packages", permission: "packagesManageAll", archive: packages.archivePackageAction, restore: packages.restorePackageAction },
  { kind: "barbers", permission: "barbersManageAll", archive: barbers.archiveBarberAction, restore: barbers.restoreBarberAction },
];

beforeEach(() => {
  for (const key of Object.keys(mocks)) mocks[key].mockReset();
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.archive.mockResolvedValue({ ok: true });
  mocks.restore.mockResolvedValue({ ok: true });
});

describe.each(CASES)("$kind archive and restore actions", ({ kind, permission, archive, restore }) => {
  it("archives with its own switch, then refreshes the public data", async () => {
    const result = await archive("some-slug");
    expect(mocks.requirePrincipal).toHaveBeenCalledWith(permission, { capability: `${kind}.archive` });
    expect(mocks.archive).toHaveBeenCalledWith({}, kind, "some-slug", "admin-1");
    expect(mocks.revalidate).toHaveBeenCalledWith([kind]);
    expect(result).toMatchObject({ status: "success", code: "archived" });
  });

  it("restores with its own, different switch", async () => {
    const result = await restore("some-slug");
    expect(mocks.requirePrincipal).toHaveBeenCalledWith(permission, { capability: `${kind}.restore` });
    expect(mocks.restore).toHaveBeenCalledWith({}, kind, "some-slug", "admin-1");
    expect(result).toMatchObject({ status: "success", code: "restored" });
  });

  it("does nothing when the switch is off or the session is not allowed", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(403));
    for (const run of [archive, restore]) expect(await run("some-slug")).toMatchObject({ status: "error", code: "denied" });
    expect(mocks.archive).not.toHaveBeenCalled();
    expect(mocks.restore).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("refuses bad slugs before touching anything, and honours the rate limit", async () => {
    for (const slug of [undefined, null, 5, {}, "", "Has Space", "../x", "UPPER"]) {
      for (const run of [archive, restore]) expect(await run(slug), String(slug)).toMatchObject({ status: "error", code: "invalid" });
    }
    expect(mocks.archive).not.toHaveBeenCalled();
    mocks.consume.mockResolvedValue({ allowed: false });
    expect(await archive("some-slug")).toMatchObject({ status: "error", code: "rate" });
    expect(mocks.archive).not.toHaveBeenCalled();
  });

  it("passes a refusal from the repository on, without refreshing the site", async () => {
    mocks.archive.mockResolvedValue({ ok: false, error: "already_archived" });
    expect(await archive("some-slug")).toMatchObject({ status: "error", code: "already_archived" });
    mocks.restore.mockResolvedValue({ ok: false, error: "not_archived" });
    expect(await restore("some-slug")).toMatchObject({ status: "error", code: "not_archived" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe("the barber rule", () => {
  it("tells the admin how many upcoming bookings block the archive", async () => {
    mocks.archive.mockResolvedValue({ ok: false, error: "upcoming_bookings", count: 3 });
    const result = await barbers.archiveBarberAction("daniel-carter");
    expect(result).toMatchObject({ status: "error", code: "upcoming_bookings" });
    expect(result.message).toMatch(/3 upcoming bookings/);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
