import { formatMoney } from "@/lib/format/money";

// Admin-side booking rules and summaries (pure). The repository enforces the same rules on write.

export const ADMIN_STATUS_LABELS = Object.freeze({
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
});

export const ADMIN_TARGETS = Object.freeze(["confirmed", "completed", "cancelled", "no_show"]);

// Which status changes an admin may make right now. Completing needs the appointment to have started;
// a no-show needs the late-arrival grace period to have passed.
export function adminAllowedActions({ status, startsAt }, { now, graceMinutes }) {
  const start = new Date(startsAt).getTime();
  const time = now.getTime();
  if (status === "pending") return ["confirmed", "cancelled"];
  if (status === "confirmed") {
    const actions = [];
    if (time >= start) actions.push("completed");
    if (time >= start + graceMinutes * 60_000) actions.push("no_show");
    actions.push("cancelled");
    return actions;
  }
  return [];
}

export const ACTION_LABELS = Object.freeze({
  confirmed: "Confirm",
  completed: "Mark completed",
  no_show: "Mark no-show",
  cancelled: "Cancel",
});

export const ADMIN_ERROR_MESSAGES = Object.freeze({
  booking_not_found: "That booking was not found.",
  booking_status_change_not_allowed: "That change is not allowed for this booking right now.",
  booking_not_markable_no_show: "Only a confirmed booking can be marked no-show.",
  late_arrival_grace_not_elapsed: "Too early to mark a no-show. Wait until the late-arrival grace period has passed.",
  account_unavailable: "The customer account is no longer available.",
});

export function adminErrorMessage(code) {
  return ADMIN_ERROR_MESSAGES[code] ?? "That change could not be made. Refresh the page and try again.";
}

// Counts per status and the expected takings of the day (confirmed and completed bookings only).
export function summarizeDay(bookings) {
  const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
  let revenue = 0;
  for (const booking of bookings) {
    if (booking.status in counts) counts[booking.status] += 1;
    if (booking.status === "confirmed" || booking.status === "completed") revenue += booking.totalPriceMinorUnits;
  }
  const currency = bookings[0]?.currency ?? "USD";
  return { counts, total: bookings.length, active: counts.pending + counts.confirmed, expected: formatMoney(revenue, currency) };
}

// ---- Search and filters for the "all bookings" screen (I-12) ----

export const SEARCH_PAGE_SIZE = 25;
const SEARCH_MAX_LENGTH = 60;
const ID_PATTERN = /^[a-f\d]{24}$/i;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`);
const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

// Reads the URL query into a safe filter object. Unknown or malformed values are dropped, never passed on.
export function parseBookingFilters(params = {}, { isValidDate, statuses = Object.keys(ADMIN_STATUS_LABELS) } = {}) {
  const text = String(firstValue(params.q) ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
  const status = String(firstValue(params.status) ?? "");
  const barber = String(firstValue(params.barber) ?? "");
  const from = String(firstValue(params.from) ?? "");
  const to = String(firstValue(params.to) ?? "");
  const page = Number.parseInt(String(firstValue(params.page) ?? "1"), 10);
  const validDate = (value) => (isValidDate ? isValidDate(value) : /^\d{4}-\d{2}-\d{2}$/.test(value));
  return {
    q: text,
    status: statuses.includes(status) ? status : "",
    barber: ID_PATTERN.test(barber) ? barber : "",
    from: validDate(from) ? from : "",
    to: validDate(to) ? to : "",
    page: Number.isInteger(page) ? Math.max(1, Math.min(page, 1000)) : 1,
  };
}

// MongoDB query for the filters. `range` converts a local date to its UTC day range (injected so this stays pure).
export function buildBookingQuery(filters, { range, toObjectId }) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.barber) query.barberId = filters.barber;
  if (filters.from || filters.to) {
    query.startsAt = {};
    if (filters.from) query.startsAt.$gte = range(filters.from).start;
    if (filters.to) query.startsAt.$lt = range(filters.to).end;
  }
  if (filters.q) {
    const or = [{ customerName: { $regex: escapeRegex(filters.q), $options: "i" } }];
    const digits = filters.q.replace(/\D/g, "");
    if (digits.length >= 3) or.push({ phoneE164: { $regex: escapeRegex(digits) } });
    if (ID_PATTERN.test(filters.q)) or.push({ _id: toObjectId(filters.q) });
    query.$or = or;
  }
  return query;
}

// URL query string for a filter set (empty values omitted), e.g. to link to another page of results.
export function filtersToQueryString(filters, overrides = {}) {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  for (const key of ["q", "status", "barber", "from", "to"]) if (merged[key]) params.set(key, merged[key]);
  if (merged.page > 1) params.set("page", String(merged.page));
  const text = params.toString();
  return text ? `?${text}` : "";
}

// Keeps only the status buttons an Admin may use: Cancel needs bookings.cancel, every other change
// needs bookings.changeStatus. Interface only; the action checks the same switches on the server.
export function permittedActions(actions, can) {
  return actions.filter((to) => (to === "cancelled" ? can?.["bookings.cancel"] === true : can?.["bookings.changeStatus"] === true));
}
