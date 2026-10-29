"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelDeletionAction, requestDeletionAction } from "@/app/user/profile/deletion-actions";
import { notify } from "@/lib/toast/notify";

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" });

export function DeletionPanel({ pending: request }) {
  const router = useRouter();
  const [state, formAction, submitting] = useActionState(requestDeletionAction, { status: "idle" });
  const [cancelling, start] = useTransition();

  useEffect(() => {
    if (state.status === "success") { notify("deletionRequested"); router.refresh(); }
    else if (state.status === "error") notify(state.code === "denied" ? "signInRequired" : state.code === "rate" ? "rateLimited" : "adminFailed");
  }, [state, router]);

  if (request) {
    return (
      <div className="dash-form">
        <p className="dash-form-note">You asked the shop to delete your account on {WHEN.format(new Date(request.requestedAt))}. We will contact you before anything is removed. You can still change your mind.</p>
        <div className="dash-form-actions">
          <button className="button button-small button-outline" type="button" disabled={cancelling} onClick={() => start(async () => { const result = await cancelDeletionAction(); notify(result.status === "success" ? "deletionCancelled" : "adminFailed"); router.refresh(); })}>
            <span>{cancelling ? "Working…" : "Cancel my request"}</span>
          </button>
        </div>
      </div>
    );
  }

  const error = state.fieldErrors?.confirm;
  return (
    <form action={formAction} className="dash-form" noValidate>
      <p className="dash-form-note">Ask the shop to delete your account and personal details. Nothing is deleted straight away: we review the request, keep records the law requires, and contact you first.</p>
      <div className="dash-field">
        <label htmlFor="delete-confirm">Type your email address to confirm</label>
        <input id="delete-confirm" name="confirm" type="email" autoComplete="off" required aria-invalid={error ? "true" : undefined} aria-describedby={error ? "delete-confirm-error" : undefined} />
        {error ? <small className="dash-field-error" id="delete-confirm-error" role="alert">{error}</small> : null}
      </div>
      <div className="dash-form-actions">
        <button className="button button-small button-outline" type="submit" disabled={submitting}><span>{submitting ? "Sending…" : "Request account deletion"}</span></button>
      </div>
    </form>
  );
}
