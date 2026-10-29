"use client";

import { Toaster } from "sonner";

// Themed with the design tokens so toasts match the glass/gold surfaces.
export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      closeButton
      toastOptions={{
        style: {
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border-warm)",
          borderRadius: "8px",
          boxShadow: "var(--depth-shadow-2)",
          fontFamily: "var(--font-manrope)",
        },
      }}
    />
  );
}
