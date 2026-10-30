"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast/notify";

// Archive or restore one catalog record (services, packages, barbers). `action` is the matching Server Action,
// which re-checks the session, role and the Super Admin switch itself; the button is only a convenience.
export function ArchiveButton({ action, slug, name, restoring = false }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");

  function run() {
    if (!restoring && !window.confirm(`Archive ${name}? It is hidden everywhere and can be restored later.`)) return;
    start(async () => {
      const result = await action(slug);
      setNote(result.status === "success" ? "" : result.message ?? "");
      notify(result.status === "success" ? (restoring ? "adminRestored" : "adminArchived") : result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminBlocked");
      router.refresh();
    });
  }

  return (
    <>
      <button className="dash-link-button" type="button" onClick={run} disabled={pending} aria-label={`${restoring ? "Restore" : "Archive"} ${name}`}>
        {pending ? "Saving…" : restoring ? "Restore" : "Archive"}
      </button>
      {note ? <small className="dash-muted" role="alert">{note}</small> : null}
    </>
  );
}
