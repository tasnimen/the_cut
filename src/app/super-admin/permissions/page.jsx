import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { PermissionMatrix } from "@/features/dashboard/permissions/PermissionMatrix";
import { requirePrincipal } from "@/lib/auth/authorization";
import { loadAdminGrants, loadAdminGrantsMeta } from "@/lib/auth/capabilities";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";

export const metadata = { title: "Admin permissions | Super admin | The Cut Barbershop", robots: { index: false, follow: false } };

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });

export default async function AdminPermissionsPage() {
  await requireDashboardAccess("superAdmin");
  await requirePrincipal("securitySettingsManage");
  const { db } = await getMongo();
  const [grants, meta] = await Promise.all([loadAdminGrants(db), loadAdminGrantsMeta(db)]);

  return (
    <>
      <PageHeader
        eyebrow="Super admin"
        title="Admin permissions"
        description="Choose which pages and actions Admin users can use. One set of switches applies to every Admin. You, as Super Admin, are never limited by these switches."
      />
      <Panel title="Pages and actions">
        <p className="dash-form-note">
          {meta.updatedAt ? `Last saved ${WHEN.format(new Date(meta.updatedAt))} (Eastern), change number ${meta.version}.` : "Nothing was ever saved, so every switch is on: Admins can do everything they could before."}
          {" "}A change reaches an Admin on their next click. Hiding a page also turns off its actions. Admins can never reach the Super admin area, this page, the audit log or admin accounts, whatever you choose here.
        </p>
        <PermissionMatrix initial={grants} />
      </Panel>
    </>
  );
}
