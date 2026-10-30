import { DashboardShell } from "@/features/dashboard/components/DashboardShell";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export const metadata = {
  title: "Admin | The Cut Barbershop",
  robots: { index: false, follow: false },
};

export default async function Layout({ children }) {
  const principal = await requireDashboardAccess("admin");
  // A Super Admin sees every entry; an Admin only the pages the Super Admin left switched on.
  const can = principal.role === "ADMIN" ? await effectiveCapabilities(principal.role) : null;
  return <DashboardShell areaKey="admin" principal={principal} can={can}>{children}</DashboardShell>;
}
