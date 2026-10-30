import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

// The whole save path for a barber picture with the real picture code (only the barber record write, sign-in,
// rate limit and cache refresh are replaced): the form fields the browser sends really end up on the barber.
const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), consume: vi.fn(), revalidate: vi.fn(), update: vi.fn(), create: vi.fn(), tables: { current: null } }));
class AuthorizationError extends Error { constructor(status = 403) { super("denied"); this.status = status; } }

vi.mock("@/lib/auth/authorization", () => ({ requirePrincipal: mocks.requirePrincipal, AuthorizationError }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.consume }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: mocks.tables.current.db }), ensureApplicationIndexes: vi.fn() }));
vi.mock("@/lib/catalog/revalidate", () => ({ revalidateCatalog: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (path) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("@/lib/catalog/admin-barbers", () => ({ createAdminBarber: mocks.create, updateAdminBarber: mocks.update, setAdminBarberActive: vi.fn() }));
vi.mock("@/lib/catalog/admin-services", () => ({ listAdminServices: async () => [{ slug: "haircut" }] }));
vi.mock("@/lib/gallery/media", () => ({ removeGalleryMedia: vi.fn() }));
vi.mock("@/lib/security/audit-log", () => ({ appendAuditEvent: async (db, event) => db.collection("auditLog").insertOne(event) }));

const { createBarberAction, updateBarberAction } = await import("./actions.js");
process.env.CLOUDINARY_CLOUD_NAME = "demo";

const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
const matches = (doc, filter) => Object.entries(filter).every(([key, expected]) => (expected === null ? get(doc, key) == null : String(get(doc, key)) === String(expected)));
function fakeDb(barbers, media) {
  const tables = { barber: barbers, media, auditLog: [] };
  const db = { collection: (name) => ({
    findOne: async (filter) => tables[name].find((row) => matches(row, filter)) ?? null,
    insertOne: async (doc) => { tables[name].push(doc); },
    updateOne: async (filter, update) => {
      const row = tables[name].find((item) => matches(item, filter));
      if (!row) return { matchedCount: 0 };
      Object.assign(row, update.$set ?? {});
      for (const key of Object.keys(update.$unset ?? {})) delete row[key];
      return { matchedCount: 1 };
    },
  }) };
  return { db, tables };
}

function barberForm(extra = {}) {
  const fields = { name: "Daniel Carter", displayOrder: "1", active: "on", publicProfile: "on", role: "Master Barber", focus: "Classic cuts", serviceSlugs: "haircut", daysOff: "", day_monday_works: "on", day_monday_open: "09:00", day_monday_close: "17:00", ...extra };
  const data = new Map(Object.entries(fields));
  return { get: (key) => (data.has(key) ? data.get(key) : null), getAll: (key) => (data.has(key) ? [data.get(key)] : []), has: (key) => data.has(key), entries: () => data.entries() };
}
const url = "https://res.cloudinary.com/demo/image/upload/v1/the-cut/barbers/portrait.webp";
const pendingMedia = () => ({ _id: new ObjectId(), category: "barbers", provider: "cloudinary", secureUrl: url, width: 1003, height: 1254, createdAt: new Date() });

beforeEach(() => {
  for (const key of ["requirePrincipal", "consume", "revalidate", "update", "create"]) mocks[key].mockReset();
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.update.mockResolvedValue({ ok: true });
  mocks.create.mockResolvedValue({ ok: true });
});

describe("saving a barber with a picture", () => {
  it("attaches the uploaded picture with its description when Save is pressed (edit)", async () => {
    const media = pendingMedia();
    mocks.tables.current = fakeDb([{ slug: "daniel-carter", name: "Daniel Carter" }], [media]);
    const result = await updateBarberAction("daniel-carter", {}, barberForm({ imageMediaId: String(media._id), imageAlt: "Professional portrait of Daniel Carter, barber at The Cut Barbershop." }));
    expect(result.status).toBe("success");
    const saved = mocks.tables.current.tables.barber[0];
    expect(saved.image).toEqual({ mediaId: String(media._id), secureUrl: url, width: 1003, height: 1254, alt: "Professional portrait of Daniel Carter, barber at The Cut Barbershop." });
    expect(media.attachedTo).toEqual({ kind: "barbers", slug: "daniel-carter" });
    expect(mocks.tables.current.tables.auditLog.map((event) => event.action)).toContain("catalog.image_attached");
    expect(mocks.revalidate).toHaveBeenCalledWith(["barbers"]);
  });

  it("attaches it on create too", async () => {
    const media = pendingMedia();
    mocks.tables.current = fakeDb([{ slug: "new-barber", name: "New Barber" }], [media]);
    await expect(createBarberAction({}, barberForm({ slug: "new-barber", name: "New Barber", imageMediaId: String(media._id), imageAlt: "Professional portrait of New Barber, barber at The Cut Barbershop." }))).rejects.toThrow("REDIRECT:/admin/barbers");
    expect(mocks.tables.current.tables.barber[0].image.secureUrl).toBe(url);
  });

  it("saves the record but attaches nothing when the form carries no upload (the page was left before Save)", async () => {
    const media = pendingMedia();
    mocks.tables.current = fakeDb([{ slug: "daniel-carter", name: "Daniel Carter" }], [media]);
    const result = await updateBarberAction("daniel-carter", {}, barberForm());
    expect(result.status).toBe("success");
    expect(mocks.tables.current.tables.barber[0].image).toBeUndefined();
    expect(media.attachedTo).toBeUndefined();
  });

  it("does not save anything when a picture arrives without a description", async () => {
    const media = pendingMedia();
    mocks.tables.current = fakeDb([{ slug: "daniel-carter", name: "Daniel Carter" }], [media]);
    const result = await updateBarberAction("daniel-carter", {}, barberForm({ imageMediaId: String(media._id), imageAlt: "" }));
    expect(result).toMatchObject({ status: "error", code: "invalid", fieldErrors: { imageAlt: expect.stringMatching(/Describe/) } });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
