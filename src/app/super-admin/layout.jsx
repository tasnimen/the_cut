import { DashboardShell } from "@/features/dashboard/components/DashboardShell";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export const metadata = {
  title: "Super admin | The Cut Barbershop",
  robots: { index: false, follow: false },
};

export default async function Layout({ children }) {
  const principal = await requireDashboardAccess("superAdmin");
  return <DashboardShell areaKey="superAdmin" principal={principal}>{children}</DashboardShell>;
}
