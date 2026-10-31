"use client";

import { useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const REASONS = { open: "", full: "Fully booked", closed: "Closed", past: "Past", loading: "" };
const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });
const dayLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

// A month calendar for the booking window. A date that cannot be booked is shown muted with a reason (never hidden):
// fully booked, closed (holiday or day off) or past. `states` maps a date to { state, availableTimes }.
export function AvailabilityCalendar({ today, value, onChange, states, lastDate }) {
  const [visible, setVisible] = useState(() => (value || today).slice(0, 7));
  const [year, month] = visible.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [
    ...Array.from({ length: first.getUTCDay() }, (_, index) => ({ key: `blank-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `${visible}-${String(index + 1).padStart(2, "0")}`, day: index + 1 })),
  ];
  const shift = (offset) => { const next = new Date(Date.UTC(year, month - 1 + offset, 1)); setVisible(next.toISOString().slice(0, 7)); };

  return (
    <div className="booking-calendar" role="group" aria-label="Choose a date">
      <div className="booking-calendar-heading">
        <button type="button" className="booking-calendar-nav" onClick={() => shift(-1)} disabled={visible <= today.slice(0, 7)} aria-label="Previous month">‹</button>
        <h3 aria-live="polite">{monthLabel.format(first)}</h3>
        <button type="button" className="booking-calendar-nav" onClick={() => shift(1)} disabled={visible >= lastDate.slice(0, 7)} aria-label="Next month">›</button>
      </div>
      <div className="booking-calendar-grid">
        {WEEKDAYS.map((weekday) => <span className="booking-weekday" key={weekday}>{weekday}</span>)}
        {cells.map((cell) => {
          if (!cell.day) return <span className="booking-calendar-empty" key={cell.key} aria-hidden="true" />;
          const entry = states?.[cell.key];
          const outside = cell.key < today || cell.key > lastDate;
          const state = outside ? (cell.key < today ? "past" : "closed") : entry?.state ?? "loading";
          const bookable = state === "open";
          const reason = outside && cell.key > lastDate ? "Not open for booking yet" : REASONS[state];
          return (
            <button
              key={cell.key}
              type="button"
              className={`booking-calendar-day is-${state}${value === cell.key ? " is-selected" : ""}`}
              aria-disabled={!bookable && state !== "loading" ? "true" : undefined}
              aria-pressed={value === cell.key}
              aria-label={`${dayLabel.format(new Date(`${cell.key}T12:00:00Z`))}${reason ? `, ${reason}` : bookable ? ", times available" : ""}`}
              title={reason || undefined}
              onClick={() => { if (bookable || state === "loading") onChange(cell.key); }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <ul className="booking-legend" aria-label="Calendar key">
        <li className="is-open">Available</li>
        <li className="is-full">Fully booked</li>
        <li className="is-closed">Closed or past</li>
      </ul>
    </div>
  );
}
