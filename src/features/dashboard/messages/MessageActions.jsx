"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMessageAction, setMessageStatusAction } from "@/app/admin/messages/actions";
import { MESSAGE_STATUS_LABELS } from "@/lib/contact/message-status";
import { notify } from "@/lib/toast/notify";

// Status buttons (and, for Super Admins only, delete). The server re-checks every permission.
export function MessageActions({ id, status, canDelete, canMark = true }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function setStatus(next) {
    start(async () => {
      const result = await setMessageStatusAction(id, next);
      notify(result.status === "success" ? "adminSaved" : result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed");
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const result = await deleteMessageAction(id);
      if (result.status === "success") { notify("messageDeleted"); router.push("/admin/messages"); router.refresh(); return; }
      setConfirming(false);
      notify(result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed");
    });
  }

  if (confirming) {
    return (
      <div className="dash-confirm" role="group" aria-label="Confirm delete">
        <p>Delete this message for good? This cannot be undone.</p>
        <div className="dash-form-actions">
          <button className="button button-small" type="button" disabled={pending} onClick={remove}><span>{pending ? "Deleting…" : "Yes, delete"}</span></button>
          <button className="button button-small button-outline" type="button" disabled={pending} onClick={() => setConfirming(false)}><span>Keep it</span></button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-form-actions">
      {canMark ? Object.entries(MESSAGE_STATUS_LABELS).filter(([value]) => value !== status).map(([value, label]) => (
        <button key={value} className="button button-small button-outline" type="button" disabled={pending} onClick={() => setStatus(value)}>
          <span>{value === "new" ? "Mark as new" : `Mark as ${label.toLowerCase()}`}</span>
        </button>
      )) : null}
      {canDelete ? <button className="dash-link-button" type="button" disabled={pending} onClick={() => setConfirming(true)}>Delete</button> : null}
    </div>
  );
}
