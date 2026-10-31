import { describe, expect, it } from "vitest";
import { buildIcs, sequenceFor } from "./ics.js";

const base = { uid: "booking-abc@cut.example.test", start: new Date("2026-11-09T15:00:00Z"), end: new Date("2026-11-09T15:30:00Z"), summary: "Haircut at The Cut", now: new Date("2026-10-31T12:00:00Z") };

describe("calendar file", () => {
  it("is a valid calendar with CRLF lines, one event, a fixed UID and the shop's time zone block", () => {
    const ics = buildIcs(base);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("UID:booking-abc@cut.example.test");
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("BEGIN:VTIMEZONE\r\nTZID:America/New_York");
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("writes local Eastern wall time, correct on both sides of the daylight saving change", () => {
    // Nov 9 is after the change (EST, UTC-5): 15:00 UTC is 10:00 local. Oct 31 is before it (EDT, UTC-4): 20:00 UTC is 16:00.
    expect(buildIcs(base)).toContain("DTSTART;TZID=America/New_York:20261109T100000");
    expect(buildIcs(base)).toContain("DTEND;TZID=America/New_York:20261109T103000");
    expect(buildIcs({ ...base, start: new Date("2026-10-31T20:00:00Z"), end: new Date("2026-10-31T20:20:00Z") })).toContain("DTSTART;TZID=America/New_York:20261031T160000");
    // The change itself: 2026-11-01 05:30 UTC is 01:30 EDT, and 06:30 UTC is 01:30 EST again.
    expect(buildIcs({ ...base, start: new Date("2026-11-01T06:30:00Z"), end: new Date("2026-11-01T07:00:00Z") })).toContain("DTSTART;TZID=America/New_York:20261101T013000");
    // Spring: 2027-03-14 07:30 UTC is 03:30 EDT (2:00 to 3:00 does not exist).
    expect(buildIcs({ ...base, start: new Date("2027-03-14T07:30:00Z"), end: new Date("2027-03-14T08:00:00Z") })).toContain("DTSTART;TZID=America/New_York:20270314T033000");
  });

  it("cancels the same event with METHOD:CANCEL and STATUS:CANCELLED", () => {
    const ics = buildIcs({ ...base, method: "CANCEL", sequence: 5 });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SEQUENCE:5");
    expect(ics).toContain("UID:booking-abc@cut.example.test");
  });

  it("refuses an unknown method", () => {
    expect(() => buildIcs({ ...base, method: "PUBLISH" })).toThrow();
  });

  it("grows the sequence with each change so an update replaces the event", () => {
    const first = sequenceFor("2026-10-31T12:00:00Z");
    const second = sequenceFor("2026-10-31T12:01:00Z");
    expect(second).toBeGreaterThan(first);
    expect(sequenceFor("2025-01-01T00:00:00Z")).toBe(0);
  });

  it("escapes commas, semicolons, backslashes and new lines, and folds long lines at 75 bytes", () => {
    const ics = buildIcs({ ...base, summary: "A, B; C\\D\nE", description: "x".repeat(300), location: "1 Main St, New York, NY" });
    expect(ics).toContain("SUMMARY:A\\, B\\; C\\\\D\\nE");
    expect(ics).toContain("LOCATION:1 Main St\\, New York\\, NY");
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    expect(ics).toMatch(/\r\n x{10,}/);
  });
});
