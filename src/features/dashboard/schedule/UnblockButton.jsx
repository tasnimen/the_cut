"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unblockAction } from "@/app/admin/schedule/actions";
import { notify } from "@/lib/toast/notify";

export function UnblockButton({ id, label }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    if (!window.confirm(`Unblock ${label}? The time can be booked again straight away.`)) return;
    start(async () => {
      const result = await unblockAction(id);
      notify(result.status === "success" ? "adminSaved" : result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed");
      router.refresh();
    });
  }

  return <button className="dash-link-button" type="button" onClick={run} disabled={pending} aria-label={`Unblock ${label}`}>{pending ? "Saving…" : "Unblock"}</button>;
}
