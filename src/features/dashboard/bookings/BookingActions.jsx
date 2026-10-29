"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeBookingStatusAction } from "@/app/admin/bookings/actions";
import { ACTION_LABELS } from "@/lib/booking/admin-bookings";
import { notify } from "@/lib/toast/notify";

// Status buttons for one booking. `actions` is computed on the server; the server re-checks every change.
export function BookingActions({ bookingId, customer, actions }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(null);

  function run(to) {
    start(async () => {
      const result = await changeBookingStatusAction(bookingId, to);
      setConfirming(null);
      if (result.status === "success") notify("adminSaved");
      else notify(result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed");
      router.refresh();
    });
  }

  if (actions.length === 0) return <span className="dash-muted">No changes</span>;

  if (confirming) {
    return (
      <span className="dash-row-actions" role="group" aria-label={`Confirm ${ACTION_LABELS[confirming].toLowerCase()} for ${customer}`}>
        <span className="dash-muted">{confirming === "cancelled" ? "Cancel and email the customer?" : confirming === "no_show" ? "Count this as a no-show?" : "Are you sure?"}</span>
        <button className="dash-link-button" type="button" disabled={pending} onClick={() => run(confirming)}>{pending ? "Saving…" : "Yes"}</button>
        <button className="dash-link-button" type="button" disabled={pending} onClick={() => setConfirming(null)}>No</button>
      </span>
    );
  }

  return (
    <span className="dash-row-actions">
      {actions.map((to) => (
        <button key={to} className="dash-link-button" type="button" disabled={pending} onClick={() => (to === "confirmed" || to === "completed" ? run(to) : setConfirming(to))} aria-label={`${ACTION_LABELS[to]} for ${customer}`}>
          {ACTION_LABELS[to]}
        </button>
      ))}
    </span>
  );
}
