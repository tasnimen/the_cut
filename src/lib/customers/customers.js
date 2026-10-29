// Admin customers list (pure helpers). Admins see a limited view: name, email, join date, status and
// booking counts. No phone numbers, no password data, no session data, no role changes.

export const CUSTOMER_PAGE_SIZE = 25;
const SEARCH_MAX_LENGTH = 60;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`);
const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

export function parseCustomerFilters(params = {}) {
  const rawQ = firstValue(params.q);
  const q = String(typeof rawQ === "string" ? rawQ : "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
  const flag = String(firstValue(params.flag) ?? "");
  const page = Number.parseInt(String(firstValue(params.page) ?? "1"), 10);
  return {
    q,
    flag: flag === "review" ? "review" : "",
    page: Number.isInteger(page) ? Math.max(1, Math.min(page, 1000)) : 1,
  };
}

// Only real customers (role USER); admins and super admins are managed elsewhere.
export function buildCustomerQuery(filters) {
  const query = { role: "USER" };
  if (filters.flag === "review") query.adminReviewRequired = true;
  if (filters.q) {
    const pattern = { $regex: escapeRegex(filters.q), $options: "i" };
    query.$or = [{ name: pattern }, { email: pattern }];
  }
  return query;
}

export function customersQueryString(filters, overrides = {}) {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.flag) params.set("flag", merged.flag);
  if (merged.page > 1) params.set("page", String(merged.page));
  const text = params.toString();
  return text ? `?${text}` : "";
}

// One list row from a user document, its booking statistics and any pending deletion request.
export function shapeCustomer(user, stats, deletion) {
  return Object.freeze({
    id: String(user._id ?? user.id),
    name: String(user.name || "").trim() || "(no name)",
    email: String(user.email || ""),
    joinedAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    suspended: user.status !== undefined && user.status !== "ACTIVE",
    bookings: stats?.total ?? 0,
    completed: stats?.completed ?? 0,
    noShows: Number.isInteger(user.noShowCount) ? user.noShowCount : (stats?.noShow ?? 0),
    lastVisit: stats?.lastCompleted ? new Date(stats.lastCompleted).toISOString() : null,
    needsReview: user.adminReviewRequired === true,
    deletionRequestedAt: deletion?.requestedAt ? new Date(deletion.requestedAt).toISOString() : null,
  });
}
