import { ObjectId } from "mongodb";

// Better Auth's Mongo adapter stores users with an ObjectId `_id` and no `id` field,
// while sessions and principals carry the id as a string. Match both shapes.
export function userIdFilter(id) {
  if (typeof id === "string" && /^[0-9a-f]{24}$/i.test(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { id }] };
  }
  return { id };
}
