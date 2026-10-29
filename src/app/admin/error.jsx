"use client";

import { DashboardError } from "@/features/dashboard/components/DashboardError";

export default function Error({ reset }) {
  return <DashboardError reset={reset} />;
}
