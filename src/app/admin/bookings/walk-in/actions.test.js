import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), rate: vi.fn(), create: vi.fn(), availability: vi.fn() }));
class AuthorizationError extends Error {}
class BookingError extends Error { constructor(code) { super(code); this.code = code; } }

vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal }));
vi.mock("@/lib/booking/availability", () => ({ BookingError }));
vi.mock("@/lib/booking/service", () => ({ openBookingRepository: async () => ({ repository: { createWalkIn: mocks.create, adminAvailability: mocks.availability } }) }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));

const { createWalkInAction, walkInAvailabilityAction } = await import("./actions");
const input = { customerName: "Sam Carter", phone: "", serviceSlugs: ["haircut"], startsAt: "2027-04-05T14:00:00.000Z", barber: "any" };

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

  it("show friendly text for a taken slot and rethrow unexpected errors", async () => {
    mocks.create.mockRejectedValue(new BookingError("slot_just_taken"));
    expect((await createWalkInAction(input)).message).toMatch(/just taken/);
    mocks.create.mockRejectedValue(new Error("db down"));
    await expect(createWalkInAction(input)).rejects.toThrow("db down");
  });
});
