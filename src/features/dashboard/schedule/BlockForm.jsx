"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBlockAction } from "@/app/admin/schedule/actions";
import { notify } from "@/lib/toast/notify";

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });

// Block a time. The server re-checks everything; if a booking is in that time nothing is blocked and the bookings are listed.
export function BlockForm({ barbers, defaults }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createBlockAction, null);
  const [allDay, setAllDay] = useState(Boolean(defaults.allDay));
  const formRef = useRef(null);

  useEffect(() => {
    if (!state) return;
    notify(state.status === "success" ? "adminSaved" : state.code === "denied" ? "adminDenied" : state.code === "rate" ? "rateLimited" : "adminBlocked");
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form className="dash-form" action={action} ref={formRef} id="block-form" noValidate>
      <div className="dash-form-row">
        <div className="dash-field">
          <label htmlFor="bf-barber">Who</label>
          <select id="bf-barber" name="barber" defaultValue={defaults.barber || "all"}>
            <option value="all">Whole shop (every barber)</option>
            {barbers.map((barber) => <option key={barber.slug} value={barber.slug}>{barber.name}</option>)}
          </select>
        </div>
        <div className="dash-field">
          <label htmlFor="bf-start">From date</label>
          <input id="bf-start" name="startDate" type="date" required defaultValue={defaults.date} />
        </div>
        <div className="dash-field">
          <label htmlFor="bf-end">To date (optional)</label>
          <input id="bf-end" name="endDate" type="date" disabled={!allDay} />
        </div>
      </div>
      <div className="dash-form-row">
        <div className="dash-field">
          <label><input type="checkbox" name="allDay" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} /> Whole day (or several days)</label>
        </div>
        <div className="dash-field">
          <label htmlFor="bf-from">Start time</label>
          <input id="bf-from" name="startTime" type="time" disabled={allDay} defaultValue={defaults.startTime} />
        </div>
        <div className="dash-field">
          <label htmlFor="bf-to">End time</label>
          <input id="bf-to" name="endTime" type="time" disabled={allDay} defaultValue={defaults.endTime} />
        </div>
      </div>
      <div className="dash-field">
        <label htmlFor="bf-reason">Reason (only shown here, customers see &quot;Unavailable&quot;)</label>
        <input id="bf-reason" name="reason" type="text" maxLength={200} />
      </div>
      <button className="button button-small" type="submit" disabled={pending}><span>{pending ? "Blocking…" : "Block this time"}</span></button>
      {state?.status === "error" ? (
        <div role="alert" className="dash-notice">
          <p>{state.message}</p>
          {state.conflicts?.length ? (
            <ul>
              {state.conflicts.map((conflict) => (
                <li key={conflict.id}>{WHEN.format(new Date(conflict.startsAt))}: {conflict.customerName} with {conflict.barberName} ({conflict.services.join(", ")}, {conflict.status})</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : state?.status === "success" ? <p role="status">{state.message}</p> : null}
    </form>
  );
}
