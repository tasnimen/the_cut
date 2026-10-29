"use client";

import { Icon } from "@/components/ui/Icon";

// Used by each area's error.jsx. The message is deliberately generic: error details can contain
// internal information and are never shown to the visitor.
export function DashboardError({ reset }) {
  return (
    <div className="dash-empty dash-error" role="alert">
      <span className="dash-empty-icon" aria-hidden="true"><Icon name="alert" size={22} /></span>
      <h3>Something went wrong</h3>
      <p>This section could not be loaded. Try again, and if it keeps happening contact the site owner.</p>
      <button className="button button-small" type="button" onClick={() => reset()}><span>Try again</span></button>
    </div>
  );
}
