"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { describeError } from "@/lib/utils/log-error";

// Used by each area's error.jsx. The message is deliberately generic: error details can contain
// internal information and are never shown to the visitor.
export function DashboardError({ error, reset }) {
  // One safe line in the browser console (name, message, digest, short stack; no personal data) so a failure shows its cause.
  useEffect(() => {
    if (error) console.error("[dashboard error]", { ...describeError(error), digest: error.digest });
  }, [error]);
  return (
    <div className="dash-empty dash-error" role="alert">
      <span className="dash-empty-icon" aria-hidden="true"><Icon name="alert" size={22} /></span>
      <h3>Something went wrong</h3>
      <p>This section could not be loaded. The server may have been slow or restarting. Press Try again; if it keeps happening contact the site owner.</p>
      <button className="button button-small" type="button" onClick={() => reset()}><span>Try again</span></button>
    </div>
  );
}
