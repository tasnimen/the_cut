import { DASHBOARD_AREA_LABELS, visibleNav } from "@/config/dashboard-nav";
import { DashboardChrome } from "@/features/dashboard/components/DashboardChrome";

// Server wrapper used by the three area layouts. `principal` comes from requireDashboardAccess().
export function DashboardShell({ areaKey, principal, children }) {
  return (
    <DashboardChrome areaLabel={DASHBOARD_AREA_LABELS[areaKey]} nav={visibleNav(areaKey)} principal={{ ...principal, image: null }}>
      {children}
    </DashboardChrome>
  );
}
