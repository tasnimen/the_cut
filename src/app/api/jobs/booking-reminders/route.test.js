import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ env: {}, run: vi.fn(), send: vi.fn(), retry: vi.fn(), mongo: vi.fn() }));
vi.mock("@/config/env", () => ({ env: mocks.env }));
vi.mock("@/lib/booking/reminders", () => ({ runDueBookingReminders: mocks.run }));
vi.mock("@/lib/mail/booking-mail", () => ({ sendReminderMail: mocks.send, retryDueMail: mocks.retry }));
vi.mock("@/lib/db/mongo", () => ({ getMongo: mocks.mongo }));

const { GET, POST } = await import("./route.js");

const SECRET = "s".repeat(40);
const call = (handler, header) => handler(new Request("http://localhost/api/jobs/booking-reminders", { method: "POST", headers: header ? { authorization: header } : {} }));

beforeEach(() => {
  mocks.env.REMINDER_JOB_SECRET = SECRET;
  mocks.run.mockReset().mockResolvedValue({ sent: 2, failed: 1 });
  mocks.retry.mockReset().mockResolvedValue({ sent: 1, failed: 0, skipped: 0 });
  mocks.mongo.mockReset().mockResolvedValue({ db: { name: "db" } });
});
afterEach(() => vi.restoreAllMocks());

describe("booking reminder job", () => {
  it("is switched off (404) when no secret is configured, and never touches the database", async () => {
    mocks.env.REMINDER_JOB_SECRET = undefined;
    const response = await call(POST, `Bearer ${SECRET}`);
    expect(response.status).toBe(404);
    expect(mocks.mongo).not.toHaveBeenCalled();
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("refuses a missing, wrong, shorter, longer or malformed secret with 401 and does nothing", async () => {
    for (const header of [undefined, "", "Bearer ", `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(1)}`, `Bearer ${"t".repeat(40)}`, SECRET, `Basic ${SECRET}`, `bearer ${SECRET}`]) {
      const response = await call(POST, header);
      expect(response.status, String(header)).toBe(401);
      expect(response.headers.get("www-authenticate")).toBe("Bearer");
    }
    expect(mocks.run).not.toHaveBeenCalled();
    expect(mocks.mongo).not.toHaveBeenCalled();
  });

  it("runs the worker with the right secret, for POST and GET, and returns only the counts", async () => {
    for (const handler of [POST, GET]) {
      const response = await call(handler, `Bearer ${SECRET}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: true, sent: 2, failed: 1, retried: { sent: 1, failed: 0, skipped: 0 } });
    }
    expect(mocks.run).toHaveBeenCalledTimes(2);
    expect(mocks.run.mock.calls[0][0]).toMatchObject({ db: { name: "db" } });
    await mocks.run.mock.calls[0][0].sendReminder({ to: "x@example.test", name: "A", booking: { id: "b1" } });
    expect(mocks.send).toHaveBeenCalledWith({ db: { name: "db" }, to: "x@example.test", name: "A", booking: { id: "b1" } });
    expect(mocks.retry).toHaveBeenCalledWith({ db: { name: "db" } });
  });

  it("answers a generic 500 and logs one line without the secret when the job fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.run.mockRejectedValue(new Error("db down"));
    const response = await call(POST, `Bearer ${SECRET}`);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "job_failed" });
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain(SECRET);
    expect(JSON.stringify(log.mock.calls)).toContain("db down");
  });
});
