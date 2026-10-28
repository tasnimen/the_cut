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
}).strict();

export async function appendAuditEvent(db, input, options = {}) {
  const event = auditEventSchema.parse(input);
  await db.collection("auditLog").insertOne({ ...event, createdAt: new Date() }, options);
}
