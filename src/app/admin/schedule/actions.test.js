import { beforeEach, describe, expect, it, vi } from "vitest";

// Schedule Server Actions (Stage D): each re-checks the session and its own default-off switch, validates input,
// and a block that overlaps a booking is refused without changing anything.
const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), consume: vi.fn(), revalidate: vi.fn(), createTimeBlock: vi.fn(), removeTimeBlock: vi.fn(), setBarberAccepting: vi.fn(), findOne: vi.fn() }));
class AuthorizationError extends Error { constructor(status = 403) { super("denied"); this.status = status; } }

vi.mock("@/lib/auth/authorization", () => ({ requirePrincipal: mocks.requirePrincipal, AuthorizationError }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.consume }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: async () => ({ db: { collection: () => ({ findOne: mocks.findOne }) } }) }));
vi.mock("@/lib/catalog/revalidate", () => ({ revalidateCatalog: mocks.revalidate }));
vi.mock("@/lib/booking/blocks", async (importOriginal) => ({ ...(await importOriginal()), createTimeBlock: mocks.createTimeBlock, removeTimeBlock: mocks.removeTimeBlock }));
vi.mock("@/lib/booking/accepting", () => ({ setBarberAccepting: mocks.setBarberAccepting }));

const { createBlockAction, unblockAction, setBarberAcceptingAction } = await import("./actions.js");

const form = (fields) => { const data = new FormData(); for (const [key, value] of Object.entries(fields)) data.set(key, value); return data; };
const GOOD = { barber: "all", startDate: "2027-04-05", allDay: "on", reason: "Holiday" };

beforeEach(() => {
  for (const key of Object.keys(mocks)) mocks[key].mockReset();
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.createTimeBlock.mockResolvedValue({ ok: true, block: { id: "b1" } });
  mocks.removeTimeBlock.mockResolvedValue({ ok: true });
  mocks.setBarberAccepting.mockResolvedValue({ ok: true, upcomingBookings: [{ id: "x" }] });
  mocks.findOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011" });
});

describe("schedule actions", () => {
  it("each action needs its own switch", async () => {
    await createBlockAction(null, form(GOOD));
    await unblockAction("507f1f77bcf86cd799439011");
    await setBarberAcceptingAction("ann", false);
    expect(mocks.requirePrincipal.mock.calls.map((call) => call[1].capability)).toEqual(["availability.block", "availability.unblock", "availability.barberToggle"]);
    expect(mocks.requirePrincipal.mock.calls.every((call) => call[0] === "bookingsManageAll")).toBe(true);
  });

  it("does nothing when the switch is off or the session is not allowed", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(403));
    expect(await createBlockAction(null, form(GOOD))).toMatchObject({ status: "error", code: "denied" });
    expect(await unblockAction("507f1f77bcf86cd799439011")).toMatchObject({ code: "denied" });
    expect(await setBarberAcceptingAction("ann", false)).toMatchObject({ code: "denied" });
    expect(mocks.createTimeBlock).not.toHaveBeenCalled();
    expect(mocks.removeTimeBlock).not.toHaveBeenCalled();
    expect(mocks.setBarberAccepting).not.toHaveBeenCalled();
  });

  it("blocks the whole shop for a day with the actor recorded", async () => {
    expect(await createBlockAction(null, form(GOOD))).toMatchObject({ status: "success", code: "blocked" });
    const call = mocks.createTimeBlock.mock.calls[0][1];
    expect(call).toMatchObject({ barberId: null, actorId: "admin-1", reason: "Holiday" });
    expect((call.endsAt - call.startsAt) / 3_600_000).toBe(24);
  });

  it("looks the barber up by slug and refuses an unknown or malformed one", async () => {
    await createBlockAction(null, form({ ...GOOD, barber: "ann" }));
    expect(mocks.createTimeBlock.mock.calls[0][1].barberId).toBe("507f1f77bcf86cd799439011");
    mocks.findOne.mockResolvedValue(null);
    expect(await createBlockAction(null, form({ ...GOOD, barber: "ghost" }))).toMatchObject({ code: "barber_not_found" });
    expect(await createBlockAction(null, form({ ...GOOD, barber: "../x" }))).toMatchObject({ code: "invalid" });
  });

  it("refuses bad dates and times before touching anything", async () => {
    expect(await createBlockAction(null, form({ ...GOOD, startDate: "nope" }))).toMatchObject({ code: "invalid_dates" });
    expect(await createBlockAction(null, form({ barber: "all", startDate: "2027-04-05", startTime: "15:00", endTime: "14:00" }))).toMatchObject({ code: "invalid_times" });
    expect(mocks.createTimeBlock).not.toHaveBeenCalled();
  });

  it("returns the bookings in the way and says nothing was changed", async () => {
    mocks.createTimeBlock.mockResolvedValue({ ok: false, error: "conflicts", conflicts: [{ id: "bk1", customerName: "Test Customer" }] });
    const result = await createBlockAction(null, form(GOOD));
    expect(result).toMatchObject({ status: "error", code: "conflicts", conflicts: [{ id: "bk1" }] });
    expect(result.message).toMatch(/Nothing was changed/);
  });

  it("validates ids and slugs, and honours the rate limit", async () => {
    for (const id of [undefined, 5, "", "xyz", "../x", {}]) expect(await unblockAction(id), String(id)).toMatchObject({ code: "invalid" });
    for (const slug of [undefined, "", "UPPER", "a b"]) expect(await setBarberAcceptingAction(slug, true), String(slug)).toMatchObject({ code: "invalid" });
    expect(await setBarberAcceptingAction("ann", "yes")).toMatchObject({ code: "invalid" });
    mocks.consume.mockResolvedValue({ allowed: false });
    expect(await createBlockAction(null, form(GOOD))).toMatchObject({ code: "rate" });
    expect(mocks.removeTimeBlock).not.toHaveBeenCalled();
  });

  it("pausing a barber returns the untouched upcoming bookings and refreshes the public data", async () => {
    const result = await setBarberAcceptingAction("ann", false, "2027-05-01", "Vacation");
    expect(mocks.setBarberAccepting).toHaveBeenCalledWith(expect.anything(), { slug: "ann", accepting: false, until: "2027-05-01", note: "Vacation", actorId: "admin-1" });
    expect(result).toMatchObject({ status: "success", code: "paused", upcomingBookings: [{ id: "x" }] });
    expect(mocks.revalidate).toHaveBeenCalledWith(["barbers"]);
  });
});
