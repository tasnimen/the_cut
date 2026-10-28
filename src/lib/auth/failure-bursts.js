import { scheduleMailDelivery } from "../mail/mailer-core.js";

export const AUTH_FAILURE_WINDOW_MS = 10 * 60 * 1000;
export const AUTH_FAILURE_ALERT_EVERY = 5;

export function getAuthFailureWindowStart(now = new Date()) {
  return new Date(new Date(now).getTime() - AUTH_FAILURE_WINDOW_MS);
}

export function shouldAlertForAuthFailures(count) {
  return Number.isInteger(count) && count >= AUTH_FAILURE_ALERT_EVERY && count % AUTH_FAILURE_ALERT_EVERY === 0;
}

export function countRecentAuthFailures(events, now = new Date()) {
  const currentTime = new Date(now).getTime();
  const startTime = currentTime - AUTH_FAILURE_WINDOW_MS;
  return events.filter((event) => {
    const eventTime = new Date(event.createdAt).getTime();
    return eventTime >= startTime && eventTime <= currentTime;
  }).length;
}

export async function queueAuthFailureAlert({ count, schedule, recordBurst, send, onDeliveryFailure }) {
  if (!shouldAlertForAuthFailures(count)) return false;
  await recordBurst();
  scheduleMailDelivery({
    schedule,
    send,
    onFailure: onDeliveryFailure,
  });
  return true;
}

