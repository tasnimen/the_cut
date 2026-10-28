import "server-only";
import nodemailer from "nodemailer";
import { env, requireEnv } from "@/config/env";
import { createAuthMailer, createBookingMailer, createContactMailer } from "@/lib/mail/mailer-core";
import { resolveAuthBaseUrl } from "@/lib/auth/base-url";

let transport;
let authMailer;
let contactMailer;
let bookingMailer;

function getTransport() {
  if (transport) return transport;
  const port = env.SMTP_PORT;
  if (!port) throw new Error("Missing required server environment variable: SMTP_PORT");
  transport = nodemailer.createTransport({
    host: requireEnv("SMTP_HOST"),
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_PASS"),
    },
  });
  return transport;
}

function getAuthMailer() {
  if (!authMailer) authMailer = createAuthMailer({
    transport: getTransport(),
    from: requireEnv("MAIL_FROM"),
    alertTo: requireEnv("MAIL_TO"),
    allowedOrigin: resolveAuthBaseUrl(env),
  });
  return authMailer;
}

function getContactMailer() {
  if (!contactMailer) contactMailer = createContactMailer({
    transport: getTransport(),
    from: requireEnv("MAIL_FROM"),
    alertTo: requireEnv("MAIL_TO"),
  });
  return contactMailer;
}

function getBookingMailer() {
  if (!bookingMailer) bookingMailer = createBookingMailer({ transport: getTransport(), from: requireEnv("MAIL_FROM") });
  return bookingMailer;
}

export async function sendVerificationEmail(message) {
  return getAuthMailer().sendVerificationEmail(message);
}

export async function sendFailedAuthAlert(message) {
  return getAuthMailer().sendFailedAuthAlert(message);
}

export async function sendContactNotification(message) {
  return getContactMailer().sendNotification(message);
}

export async function sendContactAutoReply(message) {
  return getContactMailer().sendAutoReply(message);
}

export async function sendBookingConfirmation(message) {
  return getBookingMailer().sendConfirmation(message);
}

export async function sendBookingCancellation(message) {
  return getBookingMailer().sendCancellation(message);
}

export async function sendBookingReschedule(message) {
  return getBookingMailer().sendReschedule(message);
}

export async function sendBookingReminder(message) {
  return getBookingMailer().sendReminder(message);
}
