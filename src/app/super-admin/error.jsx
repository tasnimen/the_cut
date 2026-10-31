"use client";

import { DashboardError } from "@/features/dashboard/components/DashboardError";

export default function Error({ error, reset }) {
  return <DashboardError error={error} reset={reset} />;
}
