import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { BarberForm } from "@/features/dashboard/barbers/BarberForm";
import { getAdminBarber } from "@/lib/catalog/admin-barbers";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { barberToFormValues } from "@/lib/catalog/barber-input";
import { SERVICE_SLUG_PATTERN } from "@/lib/catalog/service-input";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { updateBarberAction } from "@/app/admin/barbers/actions";

export const metadata = { title: "Edit barber | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function EditBarberPage({ params }) {
  await requireDashboardAccess("admin");
  const { slug } = await params;
  if (!SERVICE_SLUG_PATTERN.test(slug)) notFound();
  const { db } = await getMongo();
  const [barber, services] = await Promise.all([getAdminBarber(db, slug), listAdminServices(db)]);
  if (!barber) notFound();

  return (
    <>
      <PageHeader eyebrow="Team" title={barber.name} description="Edit hours, services and what the website shows." />
      <Panel><BarberForm mode="edit" action={updateBarberAction.bind(null, slug)} initial={{ ...barberToFormValues(barber), image: barber.image }} services={services.map((service) => ({ slug: service.slug, name: service.name }))} /></Panel>
    </>
  );
}
