"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBookingAction, rescheduleBookingAction } from "@/app/user/actions";
import { formatMoney } from "@/lib/format/money";
import { STATUS_LABELS } from "@/lib/booking/user-bookings";
import { notify } from "@/lib/toast/notify";

function RescheduleForm({ booking, today, onDone }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [barber, setBarber] = useState("any");
  const [availability, setAvailability] = useState(null);
  const [slot, setSlot] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ date, barber });
    booking.services.forEach((service) => query.append("service", service.slug));
    fetch(`/api/bookings/availability?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("unavailable"); return response.json(); })
      .then((data) => { setAvailability(data); setSlot(""); setError(""); })
      .catch((failure) => { if (failure.name !== "AbortError") { setAvailability({ slots: [], barbers: [] }); setError("Availability could not be loaded. Try another date."); } });
    return () => controller.abort();
  }, [date, barber, booking.services]);

  function submit() {
    if (!slot) return;
    start(async () => {
      const result = await rescheduleBookingAction(booking.id, slot, barber);
      if (result.status === "success") { notify("bookingRescheduled"); onDone(); router.refresh(); return; }
      setError(result.message);
      notify(result.code === "denied" ? "signInRequired" : result.code === "rate" ? "rateLimited" : "bookingFailure");
    });
  }

  return (
    <div className="dash-reschedule">
      <div className="dash-form-row">
        <div className="dash-field">
          <label htmlFor={`date-${booking.id}`}>New date</label>
          <input id={`date-${booking.id}`} type="date" min={today} value={date} onChange={(event) => { setAvailability(null); setDate(event.target.value); }} />
        </div>
        <div className="dash-field">
          <label htmlFor={`barber-${booking.id}`}>Barber</label>
          <select id={`barber-${booking.id}`} value={barber} onChange={(event) => { setAvailability(null); setBarber(event.target.value); }}>
            <option value="any">Any barber</option>
            {(availability?.barbers ?? []).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
        </div>
      </div>
      <p className="dash-form-note">{availability ? (availability.slots.length ? "Choose a time (Eastern)" : "No times available on this date.") : "Loading times…"}</p>
      <div className="booking-time-grid" role="radiogroup" aria-label="Available times">
        {(availability?.slots ?? []).map((item) => (
          <button type="button" role="radio" aria-checked={slot === item.startsAt} className={`booking-time-chip${slot === item.startsAt ? " is-selected" : ""}`} key={item.startsAt} onClick={() => setSlot(item.startsAt)}>
            <span>{item.label}</span><small>{item.barberName}</small>
          </button>
        ))}
      </div>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <div className="dash-form-actions">
        <button className="button button-small" type="button" onClick={submit} disabled={!slot || pending}><span>{pending ? "Saving…" : "Confirm new time"}</span></button>
        <button className="button button-small button-outline" type="button" onClick={onDone} disabled={pending}><span>Keep current time</span></button>
      </div>
    </div>
  );
}

// An upcoming appointment with Reschedule and Cancel. The buttons only reflect the 24-hour rule;
// the server action and the booking repository enforce it again.
export function AppointmentCard({ booking, canCancel, canReschedule, today, cutoffHours }) {
  const router = useRouter();
  const [mode, setMode] = useState("idle");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function cancel() {
    start(async () => {
      const result = await cancelBookingAction(booking.id);
      if (result.status === "success") { notify("bookingCancelled"); setMode("idle"); router.refresh(); return; }
      setError(result.message);
      notify(result.code === "denied" ? "signInRequired" : result.code === "rate" ? "rateLimited" : "bookingFailure");
    });
  }

  return (
    <article className="dash-appointment">
      <div className="dash-appointment-main">
        <div>
          <p className="dash-appointment-when">{booking.localStart}</p>
          <p className="dash-appointment-what">{booking.services.map((service) => service.name).join(" + ")}</p>
          <p className="dash-muted">with {booking.barber.name} · {booking.durationMinutes} min · {formatMoney(booking.totalPriceMinorUnits, booking.currency)} before tax, paid at the shop</p>
        </div>
        <span className="dash-badge">{STATUS_LABELS[booking.status] ?? booking.status}</span>
      </div>

      {mode === "reschedule" ? <RescheduleForm booking={booking} today={today} onDone={() => setMode("idle")} /> : null}

      {mode === "cancel" ? (
        <div className="dash-confirm" role="alertdialog" aria-label="Confirm cancellation">
          <p>Cancel this appointment? This frees your time and cannot be undone.</p>
          <div className="dash-form-actions">
            <button className="button button-small" type="button" onClick={cancel} disabled={pending}><span>{pending ? "Cancelling…" : "Yes, cancel it"}</span></button>
            <button className="button button-small button-outline" type="button" onClick={() => setMode("idle")} disabled={pending}><span>Keep it</span></button>
          </div>
        </div>
      ) : null}

      {mode === "idle" ? (
        <div className="dash-appointment-actions">
          {canReschedule ? <button className="dash-link-button" type="button" onClick={() => { setError(""); setMode("reschedule"); }}>Reschedule</button> : null}
          {canCancel ? <button className="dash-link-button" type="button" onClick={() => { setError(""); setMode("cancel"); }}>Cancel</button> : null}
          {!canCancel && !canReschedule ? <p className="dash-muted">Changes are possible up to {cutoffHours} hours before the appointment. To change this one, please contact the shop.</p> : null}
        </div>
      ) : null}
      {error && mode !== "reschedule" ? <p className="auth-error" role="alert">{error}</p> : null}
    </article>
  );
}
