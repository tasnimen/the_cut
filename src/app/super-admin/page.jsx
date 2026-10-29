import { AreaPlaceholder } from "@/features/dashboard/components/AreaPlaceholder";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";

export default async function Page() {
  const principal = await requireDashboardAccess("superAdmin");
  return <AreaPlaceholder principal={principal} title="Super admin" description="Admin accounts, audit log and security settings will appear here once the super admin area is built." />;
}
