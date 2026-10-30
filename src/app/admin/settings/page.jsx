import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { ContactForm, HolidaysForm, HoursForm, SocialForm } from "@/features/dashboard/settings/SettingsForms";
import { getAdminSettings, holidaysToValues, hoursToValues } from "@/lib/catalog/admin-settings";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";

export const metadata = { title: "Settings | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  const user = await requireDashboardAccess("admin", { capability: "settings.view" });
  const can = await effectiveCapabilities(user.role);
  const { db } = await getMongo();
  const settings = await getAdminSettings(db);

  return (
    <>
      <PageHeader eyebrow="Business" title="Settings" description="Opening hours, closed dates, contact details and social links. Each section saves on its own and updates the public site within seconds." />
      {can["settings.edit"] ? null : <p className="dash-form-note" role="status">You can look at these settings but not change them.</p>}
      <fieldset disabled={!can["settings.edit"]} className="dash-readonly-group">
        <Panel title="Opening hours"><HoursForm initial={hoursToValues(settings.hours)} /></Panel>
        <Panel title="Closed dates"><HolidaysForm initial={holidaysToValues(settings.holidays)} /></Panel>
        <Panel title="Contact details"><ContactForm initial={settings.contact} /></Panel>
        <Panel title="Social links"><SocialForm initial={settings.social} /></Panel>
      </fieldset>
    </>
  );
}
