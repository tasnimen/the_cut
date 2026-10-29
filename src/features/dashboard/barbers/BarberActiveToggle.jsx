"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBarberActiveAction } from "@/app/admin/barbers/actions";
import { notify } from "@/lib/toast/notify";

export function BarberActiveToggle({ slug, name, active }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const result = await setBarberActiveAction(slug, !active);
      notify(result.status === "success" ? "adminSaved" : result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed");
      router.refresh();
    });
  }

  return (
    <button className="dash-link-button" type="button" onClick={toggle} disabled={pending} aria-label={`${active ? "Stop booking with" : "Allow booking with"} ${name}`}>
      {pending ? "Saving…" : active ? "Turn off" : "Turn on"}
    </button>
  );
}
