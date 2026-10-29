import { describe, expect, it } from "vitest";
import { generateCandidateSlots } from "../booking/rules.js";
import { BOOKING_CONFIG } from "../../config/booking.js";
import { barberToFormValues, describeBarberChanges, readBarberForm } from "./barber-input.js";

function form(values, lists = {}) {
  const data = new Map(Object.entries(values));
  return { get: (key) => (data.has(key) ? data.get(key) : null), getAll: (key) => lists[key] ?? [] };
}
const allowed = ["haircut", "shave", "combo"];
const base = { name: " Daniel Carter ", active: "on", role: "Master Barber", focus: "Classic cuts", displayOrder: "1", daysOff: "2027-12-24\n2027-12-24, 2027-01-05", day_monday_works: "on", day_monday_open: "09:00", day_monday_close: "19:00", day_monday_break: "on", day_monday_breakStart: "12:00", day_monday_breakEnd: "13:00" };
const read = (values, lists = { serviceSlugs: ["haircut", "shave"] }, options = {}) => readBarberForm(form(values, lists), { withSlug: false, allowedServiceSlugs: allowed, ...options });

describe("readBarberForm", () => {
  it("builds the schedule, break and sorted unique days off the booking engine reads", () => {
    const result = read(base);
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      name: "Daniel Carter", active: true, publicProfile: false, serviceSlugs: ["haircut", "shave"], displayOrder: 1,
      weeklySchedule: { monday: { open: "09:00", close: "19:00" } },
      breaks: { monday: { open: "12:00", close: "13:00" } },
      daysOff: ["2027-01-05", "2027-12-24"],
    });
  });

  it("produces slots through the real slot generator (and honours the lunch break)", () => {
    const { data } = read(base);
    const slots = generateCandidateSlots({ localDate: "2027-04-05", services: [{ durationMinutes: 30 }], barber: data, now: new Date("2027-04-01T10:00:00Z"), config: BOOKING_CONFIG });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((slot) => slot.startsAt === "2027-04-05T16:00:00.000Z")).toBe(false); // 12:00 EDT
    expect(slots.some((slot) => slot.startsAt === "2027-04-05T13:00:00.000Z")).toBe(true); // 09:00 EDT
  });

  it("ignores times of days that are not worked and stray form keys", () => {
    const result = read({ ...base, day_tuesday_open: "10:00", day_tuesday_close: "11:00", role_admin: "x", _id: "y" });
    expect(Object.keys(result.data.weeklySchedule)).toEqual(["monday"]);
    expect(result.data).not.toHaveProperty("_id");
  });

  it("rejects off-grid times, short days and breaks outside working hours", () => {
    expect(read({ ...base, day_monday_open: "09:10" }).fieldErrors.day_monday).toBeTruthy();
    expect(read({ ...base, day_monday_close: "09:30" }).fieldErrors.day_monday).toBeTruthy();
    expect(read({ ...base, day_monday_breakStart: "08:00" }).fieldErrors.day_monday).toBeTruthy();
    expect(read({ ...base, day_monday_breakEnd: "12:00" }).fieldErrors.day_monday).toBeTruthy();
  });

  it("validates days off, services and the active requirements", () => {
    expect(read({ ...base, daysOff: "2027-02-30" }).fieldErrors.daysOff).toBeTruthy();
    expect(read(base, { serviceSlugs: ["nope"] }).fieldErrors.serviceSlugs).toBeTruthy();
    expect(read(base, { serviceSlugs: [] }).fieldErrors.serviceSlugs).toBeTruthy();
    const { day_monday_works: _w, ...noDays } = base;
    expect(read(noDays).fieldErrors.weeklySchedule).toBeTruthy();
    const inactive = read({ ...noDays, active: "" }, { serviceSlugs: [] });
    expect(inactive.ok).toBe(true);
    expect(inactive.data).toMatchObject({ active: false, weeklySchedule: {}, serviceSlugs: [] });
  });

  it("requires a valid slug on create only and returns the entered values after an error", () => {
    expect(readBarberForm(form({ ...base, slug: "Mike-Jones" }, { serviceSlugs: ["haircut"] }), { withSlug: true, allowedServiceSlugs: allowed })).toMatchObject({ ok: true, data: { slug: "mike-jones" } });
    const bad = readBarberForm(form({ ...base, slug: "bad slug", displayOrder: "x" }, { serviceSlugs: ["haircut"] }), { withSlug: true, allowedServiceSlugs: allowed });
    expect(bad.fieldErrors).toMatchObject({ slug: expect.any(String), displayOrder: expect.any(String) });
    expect(bad.values.days.monday).toMatchObject({ works: true, open: "09:00" });
  });
});

describe("barberToFormValues / describeBarberChanges", () => {
  const barber = { slug: "daniel-carter", name: "Daniel", active: true, publicProfile: false, role: "", focus: "", displayOrder: 1, serviceSlugs: ["haircut"], weeklySchedule: { monday: { open: "09:00", close: "19:00" } }, breaks: { monday: { open: "12:00", close: "13:00" } }, daysOff: ["2027-01-05"] };

  it("round-trips a stored barber through the form values", () => {
    const values = barberToFormValues(barber);
    expect(values.days.monday).toMatchObject({ works: true, breakOn: true, breakStart: "12:00" });
    expect(values.days.tuesday).toMatchObject({ works: false, breakOn: false });
    expect(values.daysOffText).toBe("2027-01-05");
  });

  it("describes changes briefly without free text", () => {
    const after = { ...barber, name: "D", active: false, serviceSlugs: [], weeklySchedule: {}, daysOff: [] };
    expect(describeBarberChanges(barber, after)).toEqual({ name: "changed", active: "true->false", services: "1->0", weeklySchedule: "changed", daysOff: "1->0" });
  });
});
