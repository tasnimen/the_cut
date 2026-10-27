"use client";

import { useState } from "react";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePreferencePicker({ today, value, onChange, time, onTimeChange }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = value ? new Date(`${value}T12:00:00`) : new Date(`${today}T12:00:00`);
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const [todayDate] = useState(() => new Date(`${today}T00:00:00`));

  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(visibleMonth);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const previousMonthDisabled = monthStart <= new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const cells = [
    ...Array.from({ length: monthStart.getDay() }, (_, index) => ({ key: `blank-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1);
      return { key: toDateValue(date), date, day: index + 1 };
    }),
  ];

  function moveMonth(offset) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <div className="booking-calendar" aria-label="Choose a preferred date">
      <div className="booking-calendar-heading">
        <button
          type="button"
          className="booking-calendar-nav"
          onClick={() => moveMonth(-1)}
          disabled={previousMonthDisabled}
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 aria-live="polite">{monthLabel}</h3>
        <button type="button" className="booking-calendar-nav" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
      </div>
      <div className="booking-calendar-grid" role="group" aria-label={`${monthLabel} dates`}>
        {weekdays.map((weekday) => <span className="booking-weekday" key={weekday}>{weekday}</span>)}
        {cells.map((cell) => {
          if (!cell.date) return <span className="booking-calendar-empty" key={cell.key} aria-hidden="true" />;
          const selected = value === cell.key;
          const past = cell.date < todayDate;
          return (
            <button
              key={cell.key}
              type="button"
              className={`booking-calendar-day${selected ? " is-selected" : ""}`}
              onClick={() => onChange(cell.key)}
              disabled={past}
              aria-pressed={selected}
              aria-label={new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(cell.date)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <p className="booking-calendar-note">Choose a preference; availability is not checked.</p>
      <label className="booking-label" htmlFor="preferred-time">
        Preferred time
        <input id="preferred-time" type="time" value={time} onChange={(event) => onTimeChange(event.target.value)} required />
      </label>
    </div>
  );
}
