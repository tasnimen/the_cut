import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), rate: vi.fn(), create: vi.fn(), availability: vi.fn(), notify: vi.fn() }));
class AuthorizationError extends Error {}
class BookingError extends Error { constructor(code) { super(code); this.code = code; } }

vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal }));
vi.mock("@/lib/booking/availability", () => ({ BookingError }));
vi.mock("@/lib/booking/service", () => ({ openBookingRepository: async () => ({ repository: { createWalkIn: mocks.create, adminAvailability: mocks.availability } }) }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));
vi.mock("@/lib/booking/notify", () => ({ notifyBookingChange: mocks.notify }));
vi.mock("next/server", () => ({ after: (callback) => callback() }));

const { createWalkInAction, walkInAvailabilityAction } = await import("./actions");
const input = { customerName: "Sam Carter", phone: "", serviceSlugs: ["haircut"], startsAt: "2027-04-05T14:00:00.000Z", barber: "any" };

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.create.mockResolvedValue({ id: "b1", localStart: "Monday" });
  mocks.availability.mockResolvedValue({ barbers: [{ slug: "alex", name: "Alex", id: "secret" }], slots: [{ startsAt: "x", label: "10:00 AM", barberName: "Alex", barberId: "secret" }] });
});

describe("walk-in actions", () => {
  it("do nothing without bookingsManageAll or when rate limited", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError());
    expect((await createWalkInAction(input)).code).toBe("denied");
    expect((await walkInAvailabilityAction({ date: "2027-04-05", serviceSlugs: ["haircut"] })).code).toBe("denied");
    mocks.requirePrincipal.mockResolvedValue({ id: "admin-1" });
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await createWalkInAction(input)).code).toBe("rate");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("reject invalid input and client-supplied prices or owners", async () => {
    expect((await createWalkInAction({ ...input, customerName: "" })).fieldErrors.customerName).toBeTruthy();
    expect((await createWalkInAction({ ...input, priceMinorUnits: 1 })).status).toBe("error");
    expect((await createWalkInAction({ ...input, userId: "victim" })).status).toBe("error");
    expect((await walkInAvailabilityAction({ date: "tomorrow", serviceSlugs: [] })).code).toBe("invalid");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("create the walk-in with the signed-in admin as creator and return no internal ids except the booking id", async () => {
    const result = await createWalkInAction({ ...input, customerName: " Sam Carter " });
    expect(result).toMatchObject({ status: "success", bookingId: "b1" });
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ principal: { id: "admin-1" }, customerName: "Sam Carter", serviceSlugs: ["haircut"] });
    const options = await walkInAvailabilityAction({ date: "2027-04-05", serviceSlugs: ["haircut"] });
    expect(JSON.stringify(options)).not.toMatch(/secret/);
  });

  it("show friendly text for a taken slot and for a repeated click", async () => {
    mocks.create.mockRejectedValue(new BookingError("slot_just_taken"));
    expect((await createWalkInAction(input)).message).toMatch(/just taken/);
    mocks.create.mockRejectedValue(new BookingError("duplicate_request"));
    expect(await createWalkInAction(input)).toMatchObject({ status: "error", code: "duplicate_request", message: expect.stringMatching(/just booked/) });
  });

  it("turns an unexpected error into a safe message and logs one line without personal data", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.create.mockRejectedValue(new Error("db down for sam@example.com +1 212 555 0100"));
    const result = await createWalkInAction({ ...input, phone: "+1 212 555 0100" });
    expect(result).toMatchObject({ status: "error", code: "unexpected" });
    expect(result.message).toMatch(/may not have been saved/);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/sam@example|555 0100|Sam Carter/);
    expect(JSON.stringify(log.mock.calls)).toMatch(/db down/);
    mocks.availability.mockRejectedValue(new Error("db down"));
    expect((await walkInAvailabilityAction({ date: "2027-04-05", serviceSlugs: ["haircut"] })).code).toBe("unexpected");
  });

  it("a failure while checking the session or rate limit is also safe", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rate.mockRejectedValue(new Error("mongo timeout"));
    expect(await createWalkInAction(input)).toMatchObject({ status: "error", code: "unexpected" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("asks for the walk-in switch on every call, and treats a missing or switched-off permission as denied", async () => {
    await createWalkInAction(input);
    await walkInAvailabilityAction({ date: "2027-04-05", serviceSlugs: ["haircut"] });
    for (const call of mocks.requirePrincipal.mock.calls) expect(call).toEqual(["bookingsManageAll", { capability: "bookings.walkIn" }]);
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError());
    expect(await createWalkInAction(input)).toMatchObject({ status: "error", code: "denied" });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("accepts a booking with no phone number and refuses a bad one before touching the database", async () => {
    expect((await createWalkInAction({ ...input, phone: "" })).status).toBe("success");
    const bad = await createWalkInAction({ ...input, phone: "12" });
    expect(bad).toMatchObject({ status: "error", code: "invalid" });
    expect(bad.fieldErrors.phone).toBeTruthy();
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("sends a confirmation only when an email address was entered, and refuses a bad address", async () => {
    await createWalkInAction({ ...input, email: "" });
    expect(mocks.notify).not.toHaveBeenCalled();
    await createWalkInAction({ ...input, email: " Walkin@Example.COM " });
    expect(mocks.create.mock.calls.at(-1)[0]).toMatchObject({ email: "walkin@example.com" });
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ operation: "walk_in", customerUserId: "walkin:b1" }));
    mocks.notify.mockClear();
    const bad = await createWalkInAction({ ...input, email: "not-an-email" });
    expect(bad).toMatchObject({ status: "error", code: "invalid" });
    expect(bad.fieldErrors.email).toBeTruthy();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});