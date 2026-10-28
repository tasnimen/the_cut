import { describe, expect, it, vi } from "vitest";
import {
  countRecentAuthFailures,
  getAuthFailureWindowStart,
  queueAuthFailureAlert,
  shouldAlertForAuthFailures,
} from "./failure-bursts.js";

describe("failed authentication burst threshold", () => {
  it("queues alerts at five failures within ten minutes, not four or expired failures", () => {
    const now = new Date("2026-10-28T12:00:00.000Z");
    const events = [
      { createdAt: new Date(now.getTime() - 9 * 60 * 1000) },
      { createdAt: new Date(now.getTime() - 8 * 60 * 1000) },
      { createdAt: new Date(now.getTime() - 7 * 60 * 1000) },
      { createdAt: new Date(now.getTime() - 6 * 60 * 1000) },
      { createdAt: new Date(now.getTime() - 5 * 60 * 1000) },
      { createdAt: new Date(now.getTime() - 10 * 60 * 1000 - 1) },
    ];

    expect(getAuthFailureWindowStart(now)).toEqual(new Date(now.getTime() - 10 * 60 * 1000));
    expect(countRecentAuthFailures(events.slice(0, 4), now)).toBe(4);
    expect(shouldAlertForAuthFailures(countRecentAuthFailures(events.slice(0, 4), now))).toBe(false);
    expect(countRecentAuthFailures(events, now)).toBe(5);
    expect(shouldAlertForAuthFailures(countRecentAuthFailures(events, now))).toBe(true);
  });

  it("records and queues an email at the fifth recent failure", async () => {
    const recordBurst = vi.fn();
    const send = vi.fn();
    let queuedTask;
    const schedule = (task) => { queuedTask = task; };

    await expect(queueAuthFailureAlert({ count: 4, schedule, recordBurst, send, onDeliveryFailure: vi.fn() })).resolves.toBe(false);
    expect(recordBurst).not.toHaveBeenCalled();
    expect(queuedTask).toBeUndefined();

    await expect(queueAuthFailureAlert({ count: 5, schedule, recordBurst, send, onDeliveryFailure: vi.fn() })).resolves.toBe(true);
    expect(recordBurst).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
    await queuedTask();
    expect(send).toHaveBeenCalledOnce();
  });
});
