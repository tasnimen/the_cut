import { DASHBOARD_AREA_LABELS, filterNavByCapabilities, visibleNav } from "@/config/dashboard-nav";
import { DashboardChrome } from "@/features/dashboard/components/DashboardChrome";

// Server wrapper used by the three area layouts. `principal` comes from requireDashboardAccess().
// `can` (optional) is { capability: boolean } for an Admin: menu entries for switched-off pages are left out.
export function DashboardShell({ areaKey, principal, can = null, children }) {
  return (
    <DashboardChrome areaLabel={DASHBOARD_AREA_LABELS[areaKey]} nav={filterNavByCapabilities(visibleNav(areaKey), can)} principal={{ ...principal, image: null }}>
      {children}
    </DashboardChrome>
  );
}
