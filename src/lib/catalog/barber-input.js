import { z } from "zod";
import { isValidDateString } from "@/lib/catalog/holidays";
import { SERVICE_SLUG_PATTERN } from "@/lib/catalog/service-input";

// Parsing and validation for the admin barber editor (pure). The schedule shape written here is the
// one the booking engine already reads: weeklySchedule { monday: { open, close } }, breaks { monday:
// { open, close } } (one break per day), daysOff ["YYYY-MM-DD"]. Times sit on the 15-minute booking grid.

export const WEEKDAYS = Object.freeze(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
export const WEEKDAY_LABELS = Object.freeze({ monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" });
export const MAX_DAYS_OFF = 400;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMinutes = (time) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
const onGrid = (time) => TIME_PATTERN.test(time) && toMinutes(time) % 15 === 0;

export const barberFieldsSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120, "Use at most 120 characters."),
  active: z.boolean(),
  publicProfile: z.boolean(),
  role: z.string().trim().max(60, "Use at most 60 characters."),
  focus: z.string().trim().max(120, "Use at most 120 characters."),
  displayOrder: z.number().int("Enter a whole number.").min(0, "Use 0 or more.").max(999, "Use 999 or less."),
  serviceSlugs: z.array(z.string().regex(SERVICE_SLUG_PATTERN)).max(50),
}).strict();

export const barberCreateSchema = barberFieldsSchema.extend({
  slug: z.string().trim().min(2, "Use at least 2 characters.").max(60, "Use at most 60 characters.").regex(SERVICE_SLUG_PATTERN, "Use lowercase letters, numbers and hyphens."),
}).strict();

const text = (formData, key) => (typeof formData.get(key) === "string" ? formData.get(key) : "");
const wholeNumber = (value) => (/^\d{1,4}$/.test(value.trim()) ? Number(value.trim()) : Number.NaN);

// The raw values the form shows again after an error (same shape as barberToFormValues).
export function valuesFromForm(formData) {
  const days = {};
  for (const day of WEEKDAYS) {
    days[day] = {
      works: formData.get(`day_${day}_works`) === "on",
      open: text(formData, `day_${day}_open`).slice(0, 5),
      close: text(formData, `day_${day}_close`).slice(0, 5),
      breakOn: formData.get(`day_${day}_break`) === "on",
      breakStart: text(formData, `day_${day}_breakStart`).slice(0, 5),
      breakEnd: text(formData, `day_${day}_breakEnd`).slice(0, 5),
    };
  }
  return {
    slug: text(formData, "slug").slice(0, 60),
    name: text(formData, "name").slice(0, 120),
    active: formData.get("active") === "on",
    publicProfile: formData.get("publicProfile") === "on",
    role: text(formData, "role").slice(0, 60),
    focus: text(formData, "focus").slice(0, 120),
    displayOrder: text(formData, "displayOrder").slice(0, 4),
    serviceSlugs: (typeof formData.getAll === "function" ? formData.getAll("serviceSlugs") : []).filter((value) => typeof value === "string").slice(0, 60),
    daysOffText: text(formData, "daysOff").slice(0, 8000),
    days,
  };
}

// Builds the stored schedule from per-day form values; returns { weeklySchedule, breaks, errors }.
function buildSchedule(days) {
  const weeklySchedule = {};
  const breaks = {};
  const errors = {};
  for (const day of WEEKDAYS) {
    const value = days[day];
    if (!value.works) continue;
    if (!onGrid(value.open) || !onGrid(value.close)) { errors[`day_${day}`] = "Use times on a 15-minute step, like 09:00."; continue; }
    if (toMinutes(value.close) - toMinutes(value.open) < 60) { errors[`day_${day}`] = "Close at least one hour after opening."; continue; }
    weeklySchedule[day] = { open: value.open, close: value.close };
    if (!value.breakOn) continue;
    const start = value.breakStart;
    const end = value.breakEnd;
    if (!onGrid(start) || !onGrid(end) || toMinutes(end) - toMinutes(start) < 15 || toMinutes(start) < toMinutes(value.open) || toMinutes(end) > toMinutes(value.close)) {
      errors[`day_${day}`] = "The break must be on a 15-minute step and inside working hours.";
      continue;
    }
    breaks[day] = { open: start, close: end };
  }
  return { weeklySchedule, breaks, errors };
}

function parseDaysOff(textValue) {
  const lines = textValue.split(/\r?\n|,/).map((line) => line.trim()).filter(Boolean);
  const invalid = lines.filter((line) => !isValidDateString(line));
  const dates = [...new Set(lines.filter(isValidDateString))].sort();
  return { dates, invalid };
}

// Returns { ok: true, data, values } or { ok: false, fieldErrors, values }.
export function readBarberForm(formData, { withSlug, allowedServiceSlugs = [] }) {
  const values = valuesFromForm(formData);
  const fieldErrors = {};

  const scalars = {
    name: values.name,
    active: values.active,
    publicProfile: values.publicProfile,
    role: values.role,
    focus: values.focus,
    displayOrder: wholeNumber(values.displayOrder),
    serviceSlugs: [...new Set(values.serviceSlugs)],
    ...(withSlug ? { slug: values.slug.trim().toLowerCase() } : {}),
  };
  const parsed = (withSlug ? barberCreateSchema : barberFieldsSchema).safeParse(scalars);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= Number.isNaN(scalars[issue.path[0]]) ? "Enter a number." : issue.message;
    }
  }
  if (scalars.serviceSlugs.some((slug) => !allowedServiceSlugs.includes(slug))) fieldErrors.serviceSlugs = "Choose services from the list.";

  const { weeklySchedule, breaks, errors: scheduleErrors } = buildSchedule(values.days);
  Object.assign(fieldErrors, scheduleErrors);

  const { dates: daysOff, invalid } = parseDaysOff(values.daysOffText);
  if (invalid.length > 0) fieldErrors.daysOff = `These are not valid dates (use YYYY-MM-DD): ${invalid.slice(0, 3).join(", ")}`;
  else if (daysOff.length > MAX_DAYS_OFF) fieldErrors.daysOff = `Use at most ${MAX_DAYS_OFF} dates.`;

  if (values.active) {
    if (Object.keys(weeklySchedule).length === 0 && Object.keys(scheduleErrors).length === 0) fieldErrors.weeklySchedule = "Add at least one working day, or turn this barber off.";
    if (scalars.serviceSlugs.length === 0) fieldErrors.serviceSlugs ??= "Choose at least one service, or turn this barber off.";
  }

  if (!parsed.success || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors, values };
  return { ok: true, data: { ...parsed.data, weeklySchedule, breaks, daysOff }, values };
}

// Form values for an existing barber (DTO from admin-barbers.js).
export function barberToFormValues(barber) {
  const days = {};
  for (const day of WEEKDAYS) {
    const hours = barber.weeklySchedule?.[day];
    const pause = barber.breaks?.[day];
    days[day] = { works: Boolean(hours), open: hours?.open ?? "09:00", close: hours?.close ?? "17:00", breakOn: Boolean(hours && pause), breakStart: pause?.open ?? "12:00", breakEnd: pause?.close ?? "13:00" };
  }
  return {
    slug: barber.slug,
    name: barber.name,
    active: barber.active,
    publicProfile: barber.publicProfile,
    role: barber.role,
    focus: barber.focus,
    displayOrder: String(barber.displayOrder),
    serviceSlugs: barber.serviceSlugs,
    daysOffText: barber.daysOff.join("\n"),
    days,
  };
}

export function describeBarberChanges(before, after) {
  const details = {};
  if (before.name !== after.name) details.name = "changed";
  for (const key of ["active", "publicProfile", "displayOrder"]) if (before[key] !== after[key]) details[key] = `${before[key]}->${after[key]}`;
  if (before.role !== after.role || before.focus !== after.focus) details.profileText = "changed";
  if (before.serviceSlugs.join(",") !== after.serviceSlugs.join(",")) details.services = `${before.serviceSlugs.length}->${after.serviceSlugs.length}`;
  if (JSON.stringify(before.weeklySchedule) !== JSON.stringify(after.weeklySchedule)) details.weeklySchedule = "changed";
  if (JSON.stringify(before.breaks) !== JSON.stringify(after.breaks)) details.breaks = "changed";
  if (before.daysOff.join(",") !== after.daysOff.join(",")) details.daysOff = `${before.daysOff.length}->${after.daysOff.length}`;
  return details;
}
