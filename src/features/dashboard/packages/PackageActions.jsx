"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { importDefaultPackagesAction, setPackageActiveAction } from "@/app/admin/packages/actions";
import { notify } from "@/lib/toast/notify";

function toastKeyFor(result) {
  if (result.status === "success") return "adminSaved";
  if (result.code === "denied") return "adminDenied";
  if (result.code === "rate") return "rateLimited";
  return "adminFailed";
}

export function PackageActiveToggle({ slug, name, active }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="dash-link-button"
      type="button"
      disabled={pending}
      aria-label={`${active ? "Hide" : "Show"} ${name} on the pricing page`}
      onClick={() => start(async () => { notify(toastKeyFor(await setPackageActiveAction(slug, !active))); router.refresh(); })}
    >
      {pending ? "Saving…" : active ? "Hide" : "Show"}
    </button>
  );
}

export function ImportDefaultsButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="button button-small"
      type="button"
      disabled={pending}
      onClick={() => start(async () => { notify(toastKeyFor(await importDefaultPackagesAction())); router.refresh(); })}
    >
      <span>{pending ? "Importing…" : "Import the current packages"}</span>
    </button>
  );
}
