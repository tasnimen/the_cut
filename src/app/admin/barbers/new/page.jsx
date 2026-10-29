import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { BarberForm } from "@/features/dashboard/barbers/BarberForm";
import { listAdminBarbers } from "@/lib/catalog/admin-barbers";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { barberToFormValues } from "@/lib/catalog/barber-input";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { createBarberAction } from "@/app/admin/barbers/actions";

export const metadata = { title: "New barber | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function NewBarberPage() {
  await requireDashboardAccess("admin");
  const { db } = await getMongo();
  const [barbers, services] = await Promise.all([listAdminBarbers(db), listAdminServices(db)]);
  const nextOrder = barbers.reduce((max, barber) => Math.max(max, barber.displayOrder), 0) + 1;
  const initial = barberToFormValues({ slug: "", name: "", active: true, publicProfile: false, role: "", focus: "", displayOrder: Math.min(nextOrder, 999), serviceSlugs: [], weeklySchedule: {}, breaks: {}, daysOff: [] });

  return (
    <>
      <PageHeader eyebrow="Team" title="New barber" description="Add a barber, their weekly hours and the services they offer." />
      <Panel><BarberForm mode="create" action={createBarberAction} initial={initial} services={services.map((service) => ({ slug: service.slug, name: service.name }))} /></Panel>
    </>
  );
}
