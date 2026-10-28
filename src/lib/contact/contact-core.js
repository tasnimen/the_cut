import { z } from "zod";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CONTACT_MIN_FILL_MS = 3000;

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320).refine((value) => !/[\r\n]/.test(value)),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(300),
  formTicket: z.string().min(20).max(300),
  captchaToken: z.string().max(4096),
}).strict();

export function readContactFormData(formData) {
  const values = {};
  for (const key of ["name", "email", "message", "website", "formTicket", "captchaToken"]) {
    const value = formData.get(key);
    if (typeof value !== "string") return { success: false, data: null };
    values[key] = value;
  }
  return contactMessageSchema.safeParse(values);
}

export function validateContactTicket({ ticket, secret, now = Date.now() }) {
  if (typeof secret !== "string" || secret.length < 32) return false;
  const parts = String(ticket || "").split(".");
  if (parts.length !== 3) return false;
  const [issuedAtText, nonce, signature] = parts;
  if (!/^\d{13}$/.test(issuedAtText) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce) || !/^[A-Za-z0-9_-]{40,50}$/.test(signature)) return false;
  const issuedAt = Number(issuedAtText);
  const age = now - issuedAt;
  if (age < CONTACT_MIN_FILL_MS || age > 2 * 60 * 60 * 1000) return false;
  const expected = Buffer.from(signContactTicket(`${issuedAtText}.${nonce}`, secret));
  const received = Buffer.from(signature);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function signContactTicket(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createContactFormTicket({ secret, now = Date.now(), nonce = randomBytes(18).toString("base64url") }) {
  const payload = `${now}.${nonce}`;
  return `${payload}.${signContactTicket(payload, secret)}`;
}

export function scheduleContactDelivery({ schedule, notification, autoReply, updateStatus }) {
  schedule(async () => {
    await Promise.all([
      ["notification", notification],
      ["autoReply", autoReply],
    ].map(async ([kind, send]) => {
      let status = "sent";
      try {
        await send();
      } catch {
        status = "failed";
      }
      try {
        await updateStatus(kind, status);
      } catch {
        // Delivery status persistence must not leak mail or database details.
      }
    }));
  });
}
