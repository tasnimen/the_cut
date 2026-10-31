"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendMailAction } from "@/app/admin/email-log/actions";
import { notify } from "@/lib/toast/notify";

// Sends one failed email again. The server re-checks everything; this button is only a convenience.
export function ResendMailButton({ id, label }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");

  function run() {
    start(async () => {
      const result = await resendMailAction(id);
      setNote(result.status === "success" ? "" : result.message ?? "");
      notify(result.status === "success" ? "mailResent" : result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminBlocked");
      router.refresh();
    });
  }

  return (
    <>
      <button className="dash-link-button" type="button" onClick={run} disabled={pending} aria-label={`Resend the email: ${label}`}>{pending ? "Sending…" : "Resend"}</button>
      {note ? <small className="dash-muted" role="alert">{note}</small> : null}
    </>
  );
}
