import { AreaPlaceholder } from "@/features/dashboard/components/AreaPlaceholder";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export default async function Page() {
  const principal = await requireDashboardAccess("admin");
  return <AreaPlaceholder principal={principal} title="Admin dashboard" description="Bookings, customers, services and settings will appear here once the admin dashboard is built." />;
}
