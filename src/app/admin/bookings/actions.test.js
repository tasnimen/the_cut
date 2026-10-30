import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requirePrincipal: vi.fn(), rate: vi.fn(), change: vi.fn(), notify: vi.fn() }));
class AuthorizationError extends Error {}
class BookingError extends Error { constructor(code) { super(code); this.code = code; } }

vi.mock("next/server", () => ({ after: (fn) => fn() }));
vi.mock("@/lib/auth/authorization", () => ({ AuthorizationError, requirePrincipal: mocks.requirePrincipal }));
vi.mock("@/lib/booking/availability", () => ({ BookingError }));
vi.mock("@/lib/booking/notify", () => ({ notifyBookingChange: mocks.notify }));
vi.mock("@/lib/booking/service", () => ({ openBookingRepository: async () => ({ db: {}, repository: { adminChangeStatus: mocks.change } }) }));
vi.mock("@/lib/security/public-rate-limit", () => ({ consumeUserRateLimit: mocks.rate }));

const { changeBookingStatusAction } = await import("./actions");
const ID = "a".repeat(24);

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.requirePrincipal.mockResolvedValue({ id: "admin-1" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.change.mockResolvedValue({ booking: { id: ID }, customerId: "customer-1" });
});

describe("changeBookingStatusAction", () => {
  it("does nothing for a caller without bookingsManageAll", async () => {
    mocks.requirePrincipal.mockRejectedValue(new AuthorizationError());
    expect((await changeBookingStatusAction(ID, "cancelled")).code).toBe("denied");
    expect(mocks.requirePrincipal).toHaveBeenCalledWith("bookingsManageAll", { capability: "bookings.cancel" });
    expect(mocks.change).not.toHaveBeenCalled();
  });

  it("stops when rate limited and rejects bad ids and targets", async () => {
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await changeBookingStatusAction(ID, "cancelled")).code).toBe("rate");
    mocks.rate.mockResolvedValue({ allowed: true });
    expect((await changeBookingStatusAction("../x", "cancelled")).code).toBe("booking_not_found");
    expect((await changeBookingStatusAction(ID, "deleted")).code).toBe("invalid");
    expect(mocks.change).not.toHaveBeenCalled();
  });

  it("emails the customer (not the admin) after a cancellation only", async () => {
    await changeBookingStatusAction(ID, "cancelled");
    expect(mocks.notify.mock.calls[0][0]).toMatchObject({ operation: "cancel", recipientUserId: "customer-1" });
    mocks.notify.mockReset();
    await changeBookingStatusAction(ID, "completed");
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("does not try to email a walk-in customer", async () => {
    mocks.change.mockResolvedValue({ booking: { id: ID }, customerId: "walkin:" + ID });
    expect((await changeBookingStatusAction(ID, "cancelled")).status).toBe("success");
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("returns friendly text for rule failures and rethrows unexpected errors", async () => {
    mocks.change.mockRejectedValue(new BookingError("late_arrival_grace_not_elapsed"));
    expect((await changeBookingStatusAction(ID, "no_show")).message).toMatch(/grace/);
    mocks.change.mockRejectedValue(new Error("db down"));
    await expect(changeBookingStatusAction(ID, "cancelled")).rejects.toThrow("db down");
  });
});
