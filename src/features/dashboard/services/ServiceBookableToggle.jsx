"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setServiceBookableAction } from "@/app/admin/services/actions";
import { notify } from "@/lib/toast/notify";

export function ServiceBookableToggle({ slug, name, bookable }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const result = await setServiceBookableAction(slug, !bookable);
      notify(result.status === "success" ? "adminSaved" : result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed");
      router.refresh();
    });
  }

  return (
    <button className="dash-link-button" type="button" onClick={toggle} disabled={pending} aria-label={`${bookable ? "Stop new bookings for" : "Allow new bookings for"} ${name}`}>
      {pending ? "Saving…" : bookable ? "Stop bookings" : "Allow bookings"}
    </button>
  );
}
