"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { getIP } from "@better-auth/core/utils/ip";
import { requireEnv } from "@/config/env";
import { ensureApplicationIndexes, getMongo } from "@/lib/db/mongo";
import { hasPermission } from "@/lib/auth/policy";
import { ROLES } from "@/config/permissions";
import { verifyContactCaptcha } from "@/lib/contact/captcha";
import { readContactFormData, scheduleContactDelivery, validateContactTicket } from "@/lib/contact/contact-core";
import { sendContactAutoReply, sendContactNotification } from "@/lib/mail/mailer";
import { consumePublicRateLimit } from "@/lib/security/public-rate-limit";
import { CONTACT_MESSAGE_COLLECTION, createContactMessageRecord } from "@/lib/contact/contact-message-model";

const CONTACT_RATE_LIMIT = Object.freeze({ limit: 5, windowMs: 15 * 60 * 1000 });

export async function submitContactMessage(_previousState, formData) {
  if (!hasPermission(ROLES.guest, "contactCreate")) {
    return { status: "error", message: "Contact messages are currently unavailable." };
  }

  try {
  const requestHeaders = await headers();
  const rate = await consumePublicRateLimit({ headers: requestHeaders }, {
    bucket: "contact-message",
    ...CONTACT_RATE_LIMIT,
  });
  if (!rate.allowed) {
    return { status: "error", message: "Please wait before sending another message." };
  }

  const parsed = readContactFormData(formData);
  if (!parsed.success) {
    return { status: "error", message: "Check the form fields and try again." };
  }
  const message = parsed.data;
  if (!validateContactTicket({ ticket: message.formTicket, secret: requireEnv("BETTER_AUTH_SECRET") })) {
    return { status: "error", message: "The form expired. Reload the page and try again." };
  }
  if (message.website) return { status: "success", message: "Thanks. Your message has been received.", resetToken: Date.now() };

  let remoteIp = null;
  try {
    remoteIp = getIP({ headers: requestHeaders }, {}) || null;
  } catch {
    remoteIp = null;
  }
  const captcha = await verifyContactCaptcha({ token: message.captchaToken, remoteIp });
  if (!captcha.valid) return { status: "error", message: "Complete the spam protection check and try again." };

  const { db } = await getMongo();
  await ensureApplicationIndexes(db);
  const record = createContactMessageRecord(message);
  const saved = await db.collection(CONTACT_MESSAGE_COLLECTION).insertOne(record);
  const mailMessage = Object.freeze({ name: message.name, email: message.email, message: message.message });

  scheduleContactDelivery({
    schedule: after,
    notification: () => sendContactNotification(mailMessage),
    autoReply: () => sendContactAutoReply(mailMessage),
    updateStatus: async (kind, status) => db.collection(CONTACT_MESSAGE_COLLECTION).updateOne({ _id: saved.insertedId }, {
      $set: { [`${kind}Status`]: status, updatedAt: new Date() },
    }),
  });

  return { status: "success", message: "Thanks. Your message has been received.", resetToken: Date.now() };
  } catch {
    return { status: "error", message: "We couldn't save your message. Please try again." };
  }
}

