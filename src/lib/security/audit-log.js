import "server-only";
import { z } from "zod";

const auditEventSchema = z.object({
  actorId: z.string().min(1).max(128).nullable(),
  action: z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/),
  targetType: z.string().regex(/^[A-Z][A-Za-z0-9]{0,39}$/),
  targetId: z.string().max(128).nullable().optional(),
  outcome: z.enum(["success", "denied", "failure"]),
  ip: z.string().max(64).nullable().optional(),
  userAgent: z.string().max(512).nullable().optional(),
  details: z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,39}$/), z.string().max(120)).refine((value) => Object.keys(value).length <= 12, "too many details").optional(),
}).strict();

export async function appendAuditEvent(db, input, options = {}) {
  const event = auditEventSchema.parse(input);
  await db.collection("auditLog").insertOne({ ...event, createdAt: new Date() }, options);
}
