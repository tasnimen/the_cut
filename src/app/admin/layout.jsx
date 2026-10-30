import { headers } from "next/headers";
import { capabilityForAdminPath } from "@/config/admin-capabilities";
import { DashboardShell } from "@/features/dashboard/components/DashboardShell";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export const metadata = {
  title: "Admin | The Cut Barbershop",
  robots: { index: false, follow: false },
};

export default async function Layout({ children }) {
  // Checking the page's switch here (the proxy passes the path) refuses a revoked page before the loading shell streams,
  // so it is a real HTTP 404. Every page still checks its own switch as well.
  const principal = await requireDashboardAccess("admin", { capability: capabilityForAdminPath((await headers()).get("x-pathname")) ?? undefined });
  // A Super Admin sees every entry; an Admin only the pages the Super Admin left switched on.
  const can = principal.role === "ADMIN" ? await effectiveCapabilities(principal.role) : null;
  return <DashboardShell areaKey="admin" principal={principal} can={can}>{children}</DashboardShell>;
}
