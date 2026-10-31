"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBarberAcceptingAction } from "@/app/admin/schedule/actions";
import { notify } from "@/lib/toast/notify";

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });

// "Accepting bookings" for one barber. Turning it off only stops NEW bookings; the barber's upcoming appointments are
// listed afterwards so someone can look at them, and none of them is changed.
export function BarberAcceptingControl({ slug, name, accepting, pausedUntil, pauseNote }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [until, setUntil] = useState(pausedUntil || "");
  const [note, setNote] = useState(pauseNote || "");
  const [upcoming, setUpcoming] = useState(null);

  function change(next) {
    if (!next && !window.confirm(`Stop new bookings for ${name}${until ? ` until ${until}` : ""}? Existing appointments stay as they are.`)) return;
    start(async () => {
      const result = await setBarberAcceptingAction(slug, next, until, note);
      notify(result.status === "success" ? "adminSaved" : result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed");
      setUpcoming(result.upcomingBookings ?? null);
      router.refresh();
    });
  }

  return (
    <div className="dash-form-note">
      {accepting ? (
        <div className="dash-form-row">
          <div className="dash-field">
            <label htmlFor={`until-${slug}`}>Until (optional)</label>
            <input id={`until-${slug}`} type="date" value={until} onChange={(event) => setUntil(event.target.value)} />
          </div>
          <div className="dash-field">
            <label htmlFor={`note-${slug}`}>Note (only shown here)</label>
            <input id={`note-${slug}`} type="text" maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
      ) : null}
      <button className="dash-link-button" type="button" onClick={() => change(!accepting)} disabled={pending} aria-label={`${accepting ? "Stop new bookings for" : "Resume bookings for"} ${name}`}>
        {pending ? "Saving…" : accepting ? "Stop new bookings" : "Resume bookings"}
      </button>
      {upcoming?.length ? (
        <div role="status" className="dash-notice">
          <p>{name} still has {upcoming.length} upcoming appointment{upcoming.length === 1 ? "" : "s"}. They were not changed:</p>
          <ul>{upcoming.map((booking) => <li key={booking.id}>{WHEN.format(new Date(booking.startsAt))}: {booking.customerName} ({booking.services.join(", ")}, {booking.status})</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
