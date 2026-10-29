import { DashboardShell } from "@/features/dashboard/components/DashboardShell";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export const metadata = {
  title: "Admin | The Cut Barbershop",
  robots: { index: false, follow: false },
};

export default async function Layout({ children }) {
  const principal = await requireDashboardAccess("admin");
  return <DashboardShell areaKey="admin" principal={principal}>{children}</DashboardShell>;
}
