import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePrincipal: vi.fn(),
  consume: vi.fn(),
  openRepository: vi.fn(),
  notify: vi.fn(),
  after: vi.fn((task) => task()),
  cancel: vi.fn(),
  reschedule: vi.fn(),
}));

class AuthorizationError extends Error {
  constructor(status = 403) { super("denied"); this.status = status; }
}

vi.mock("@/lib/auth/authorization", () => ({ requirePrincipal: mocks.requirePrincipal, AuthorizationError }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.consume }));
vi.mock("@/lib/booking/service", () => ({ openBookingRepository: mocks.openRepository }));
vi.mock("@/lib/booking/notify", () => ({ notifyBookingChange: mocks.notify }));
vi.mock("next/server", () => ({ after: mocks.after }));

const { BookingError } = await import("@/lib/booking/availability");
const { cancelBookingAction, rescheduleBookingAction } = await import("./actions.js");

const ID = "0123456789abcdef01234567";
const principal = { id: "user-1", role: "USER" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePrincipal.mockResolvedValue(principal);
  mocks.consume.mockResolvedValue({ allowed: true });
  mocks.openRepository.mockResolvedValue({ db: {}, repository: { cancel: mocks.cancel, reschedule: mocks.reschedule } });
  mocks.cancel.mockResolvedValue({ id: ID, customerName: "A" });
  mocks.reschedule.mockResolvedValue({ id: ID, customerName: "A" });
});

describe("customer booking actions: authorization", () => {
  it("require bookingOwn on every call and touch nothing when denied", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError(401));
    expect(await cancelBookingAction(ID)).toMatchObject({ status: "error", code: "denied" });
    expect(await rescheduleBookingAction(ID, "2027-04-05T14:00:00.000Z", "any")).toMatchObject({ code: "denied" });
    for (const call of mocks.requirePrincipal.mock.calls) expect(call).toEqual(["bookingOwn"]);
    expect(mocks.openRepository).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.reschedule).not.toHaveBeenCalled();
  });

  it("stops at the rate limit before the database", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfterMs: 1 });
    expect(await cancelBookingAction(ID)).toMatchObject({ code: "rate" });
    expect(mocks.openRepository).not.toHaveBeenCalled();
  });
});

describe("customer booking actions: ownership and validation", () => {
  it("passes the signed-in principal (never a client-supplied user) to the repository", async () => {
    expect(await cancelBookingAction(ID)).toMatchObject({ status: "success", code: "cancelled" });
    expect(mocks.cancel).toHaveBeenCalledWith({ principal, bookingId: ID });
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ operation: "cancel_by_customer", customerUserId: principal.id }));
    expect(await rescheduleBookingAction(ID, "2027-04-05T14:00:00.000Z", "daniel-carter")).toMatchObject({ status: "success", code: "rescheduled" });
    expect(mocks.reschedule).toHaveBeenCalledWith({ principal, bookingId: ID, startsAt: "2027-04-05T14:00:00.000Z", barber: "daniel-carter" });
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ operation: "reschedule", customerUserId: principal.id }));
  });

  it("rejects malformed ids and times before any database work", async () => {
    for (const bad of ["", "abc", "../x", "0123456789abcdef0123456", { $ne: "x" }, null, 5]) {
      expect(await cancelBookingAction(bad), String(bad)).toMatchObject({ code: "booking_not_found" });
    }
    expect(await rescheduleBookingAction(ID, "tomorrow", "any")).toMatchObject({ code: "invalid" });
    expect(await rescheduleBookingAction(ID, "2027-04-05T14:00:00.000Z", "Bad Barber!")).toMatchObject({ code: "invalid" });
    expect(mocks.openRepository).not.toHaveBeenCalled();
  });

  it("turns repository errors into friendly messages (cutoff, not found) and sends no email", async () => {
    mocks.cancel.mockRejectedValue(new BookingError("cancellation_cutoff_passed", 409));
    const result = await cancelBookingAction(ID);
    expect(result).toMatchObject({ status: "error", code: "cancellation_cutoff_passed", message: expect.stringContaining("24 hours") });
    mocks.reschedule.mockRejectedValue(new BookingError("booking_not_found", 404));
    expect(await rescheduleBookingAction(ID, "2027-04-05T14:00:00.000Z", "any")).toMatchObject({ code: "booking_not_found" });
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("does not swallow unexpected errors", async () => {
    mocks.cancel.mockRejectedValue(new Error("db exploded"));
    await expect(cancelBookingAction(ID)).rejects.toThrow("db exploded");
  });
});
