import "server-only";
import { BOOKING_COLLECTION } from "@/lib/booking/booking-model";
import { buildCustomerQuery, CUSTOMER_PAGE_SIZE, shapeCustomer } from "@/lib/customers/customers";

const USER_PROJECTION = { name: 1, email: 1, createdAt: 1, status: 1, noShowCount: 1, adminReviewRequired: 1 };

// One page of customers with their booking statistics. The caller authorized customersRead.
export async function listCustomers(db, filters) {
  const query = buildCustomerQuery(filters);
  const [total, users] = await Promise.all([
    db.collection("user").countDocuments(query),
    db.collection("user").find(query, { projection: USER_PROJECTION }).sort({ createdAt: -1, _id: -1 }).skip((filters.page - 1) * CUSTOMER_PAGE_SIZE).limit(CUSTOMER_PAGE_SIZE).toArray(),
  ]);
  const ids = users.map((user) => String(user._id));
  const [statRows, deletionRows] = ids.length === 0 ? [[], []] : await Promise.all([
    db.collection(BOOKING_COLLECTION).aggregate([
      { $match: { userId: { $in: ids } } },
      { $group: {
        _id: "$userId",
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] } },
        lastCompleted: { $max: { $cond: [{ $eq: ["$status", "completed"] }, "$startsAt", null] } },
      } },
    ]).toArray(),
    db.collection("accountDeletionRequest").find({ userId: { $in: ids }, status: "pending" }, { projection: { _id: 0, userId: 1, requestedAt: 1 } }).toArray(),
  ]);
  const stats = new Map(statRows.map((row) => [row._id, row]));
  const deletions = new Map(deletionRows.map((row) => [row.userId, row]));
  return {
    customers: users.map((user) => shapeCustomer(user, stats.get(String(user._id)), deletions.get(String(user._id)))),
    total,
    page: filters.page,
    pageSize: CUSTOMER_PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE)),
  };
}
