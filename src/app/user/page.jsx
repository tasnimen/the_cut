import { AreaPlaceholder } from "@/features/dashboard/components/AreaPlaceholder";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export default async function Page() {
  const principal = await requireDashboardAccess("user");
  return <AreaPlaceholder principal={principal} title="My account" description="Your appointments, profile and sessions will appear here once the user dashboard is built." />;
}
