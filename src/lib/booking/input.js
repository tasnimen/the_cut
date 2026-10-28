import { z } from "zod";

export function normalizeUsPhone(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const normalized = value.trim();
  if (!/^[+\d().\s-]+$/.test(normalized) || (normalized.includes("+") && !normalized.startsWith("+"))) return null;
  let digits = normalized.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}

export const UsPhoneInputSchema = z.string().trim().max(40).refine((value) => value === "" || normalizeUsPhone(value) !== null, {
  message: "Enter a valid US phone number.",
});

export function safeBookingCallbackURL(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/booking";
  try {
    const url = new URL(value, "https://the-cut.invalid");
    if (url.origin !== "https://the-cut.invalid" || url.pathname !== "/booking") return "/booking";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/booking";
  }
}
