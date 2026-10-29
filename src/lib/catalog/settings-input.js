import { HOLIDAY_FLAG_KEYS, MAX_CLOSED_DATES, isValidDateString, isValidTime } from "@/lib/catalog/holidays";
import { DAYS, SOCIAL_PLATFORMS, isValidEmail, isValidPhone, safeSocialUrl } from "@/lib/catalog/settings";

// Parsing and validation for the four business-settings forms (pure). Each reader returns
// { ok: true, data, values } or { ok: false, fieldErrors, values }; `values` echoes what was typed.
// Only known keys are read, so extra form keys cannot reach the database.

const text = (formData, key, max) => (typeof formData.get(key) === "string" ? formData.get(key).slice(0, max) : "");
const toMinutes = (time) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
const onGrid = (time) => isValidTime(time) && toMinutes(time) % 15 === 0;

export function readHoursForm(formData) {
  const values = {};
  const data = {};
  const fieldErrors = {};
  for (const day of DAYS) {
    const works = formData.get(`day_${day}_works`) === "on";
    const open = text(formData, `day_${day}_open`, 5);
    const close = text(formData, `day_${day}_close`, 5);
    values[day] = { works, open, close };
    if (!works) continue;
    if (!onGrid(open) || !onGrid(close)) fieldErrors[`day_${day}`] = "Use times on a 15-minute step, like 09:00.";
    else if (toMinutes(close) - toMinutes(open) < 60) fieldErrors[`day_${day}`] = "Close at least one hour after opening.";
    else data[day] = { open, close };
  }
  if (Object.keys(data).length === 0 && Object.keys(fieldErrors).length === 0) fieldErrors.hours = "Open on at least one day.";
  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors, values } : { ok: true, data, values };
}

export function readHolidaysForm(formData) {
  const values = {
    flags: Object.fromEntries(HOLIDAY_FLAG_KEYS.map((key) => [key, formData.get(key) === "on"])),
    earlyCloseAt: text(formData, "december24EarlyCloseAt", 5),
    datesText: text(formData, "additionalClosedDates", 6000),
  };
  const fieldErrors = {};
  const lines = values.datesText.split(/\r?\n|,/).map((line) => line.trim()).filter(Boolean);
  const invalid = lines.filter((line) => !isValidDateString(line));
  const dates = [...new Set(lines.filter(isValidDateString))].sort();
  if (invalid.length > 0) fieldErrors.additionalClosedDates = `These are not valid dates (use YYYY-MM-DD): ${invalid.slice(0, 3).join(", ")}`;
  else if (dates.length > MAX_CLOSED_DATES) fieldErrors.additionalClosedDates = `Use at most ${MAX_CLOSED_DATES} dates.`;
  if (values.flags.december24EarlyClose && !isValidTime(values.earlyCloseAt)) fieldErrors.december24EarlyCloseAt = "Enter a time like 14:00.";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors, values };
  return {
    ok: true,
    values,
    data: { ...values.flags, december24EarlyCloseAt: isValidTime(values.earlyCloseAt) ? values.earlyCloseAt : "14:00", additionalClosedDates: dates },
  };
}

export function readContactForm(formData) {
  const values = { phone: text(formData, "phone", 40).trim(), email: text(formData, "email", 300).trim().toLowerCase(), streetAddress: text(formData, "streetAddress", 200).trim(), postalCode: text(formData, "postalCode", 20).trim() };
  const fieldErrors = {};
  if (values.phone && !isValidPhone(values.phone)) fieldErrors.phone = "Enter a phone number like +1 212 555 0100.";
  if (values.email && !isValidEmail(values.email)) fieldErrors.email = "Enter a valid email address.";
  if (values.streetAddress.length > 120) fieldErrors.streetAddress = "Use at most 120 characters.";
  if (values.postalCode && !/^[A-Za-z0-9 -]{3,12}$/.test(values.postalCode)) fieldErrors.postalCode = "Enter a valid postal code.";
  if (values.postalCode && !values.streetAddress) fieldErrors.streetAddress = "Enter the street address too, or clear the postal code.";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors, values };
  return { ok: true, values, data: { phone: values.phone || null, email: values.email || null, streetAddress: values.streetAddress || null, postalCode: values.postalCode || null } };
}

export function readSocialForm(formData) {
  const values = Object.fromEntries(Object.keys(SOCIAL_PLATFORMS).map((platform) => [platform, text(formData, platform, 300).trim()]));
  const fieldErrors = {};
  const data = {};
  for (const platform of Object.keys(SOCIAL_PLATFORMS)) {
    if (!values[platform]) { data[platform] = null; continue; }
    const url = safeSocialUrl(platform, values[platform]);
    if (url) data[platform] = url;
    else fieldErrors[platform] = `Enter the full https:// link to your ${platform === "x" ? "X" : platform[0].toUpperCase() + platform.slice(1)} page.`;
  }
  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors, values } : { ok: true, data, values };
}
