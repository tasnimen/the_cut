"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setServiceActiveAction } from "@/app/admin/services/actions";
import { notify } from "@/lib/toast/notify";

export function ServiceActiveToggle({ slug, name, active }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const result = await setServiceActiveAction(slug, !active);
      notify(result.status === "success" ? "adminSaved" : result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed");
      router.refresh();
    });
  }

  return (
    <button className="dash-link-button" type="button" onClick={toggle} disabled={pending} aria-label={`${active ? "Hide" : "Show"} ${name} on the site`}>
      {pending ? "Saving…" : active ? "Hide" : "Show"}
    </button>
  );
}
