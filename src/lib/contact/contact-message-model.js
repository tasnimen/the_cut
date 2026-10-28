import { z } from "zod";

export const CONTACT_MESSAGE_COLLECTION = "contactMessage";
export const ContactMessageStatus = Object.freeze({
  new: "new",
  read: "read",
  replied: "replied",
});

export const ContactMessageRecordSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(320),
  message: z.string().min(10).max(5000),
  status: z.enum(["new", "read", "replied"]),
  notificationStatus: z.enum(["queued", "sent", "failed"]),
  autoReplyStatus: z.enum(["queued", "sent", "failed"]),
  createdAt: z.date(),
  updatedAt: z.date(),
}).strict();

export function createContactMessageRecord({ name, email, message, now = new Date() }) {
  return ContactMessageRecordSchema.parse({
    name,
    email,
    message,
    status: ContactMessageStatus.new,
    notificationStatus: "queued",
    autoReplyStatus: "queued",
    createdAt: now,
    updatedAt: now,
  });
}
