import { DashboardShell } from "@/features/dashboard/components/DashboardShell";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export const metadata = {
  title: "My account | The Cut Barbershop",
  robots: { index: false, follow: false },
};

export default async function Layout({ children }) {
  const principal = await requireDashboardAccess("user");
  return <DashboardShell areaKey="user" principal={principal}>{children}</DashboardShell>;
}
