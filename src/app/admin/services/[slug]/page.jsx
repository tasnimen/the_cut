import { notFound } from "next/navigation";
import { ArchivedNotice } from "@/features/dashboard/components/ArchivedNotice";
import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { ServiceForm } from "@/features/dashboard/services/ServiceForm";
import { getAdminService } from "@/lib/catalog/admin-services";
import { SERVICE_SLUG_PATTERN } from "@/lib/catalog/service-input";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { updateServiceAction } from "@/app/admin/services/actions";

export const metadata = { title: "Edit service | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function EditServicePage({ params }) {
  await requireDashboardAccess("admin", { capability: "services.edit" });
  const { slug } = await params;
  if (!SERVICE_SLUG_PATTERN.test(slug)) notFound();
  const { db } = await getMongo();
  const service = await getAdminService(db, slug);
  if (!service) notFound();
  if (service.archived) return (<><PageHeader eyebrow="Catalog" title={service.name} description="Archived" /><Panel><ArchivedNotice label="service" listPath="/admin/services" /></Panel></>);

  const initial = {
    slug: service.slug,
    name: service.name,
    description: service.description,
    price: service.priceMinorUnits === null ? "" : (service.priceMinorUnits / 100).toFixed(2),
    durationMinutes: String(service.durationMinutes),
    displayOrder: String(service.displayOrder),
    category: service.category,
    icon: service.icon,
    active: service.active,
    image: service.image,
  };

  return (
    <>
      <PageHeader eyebrow="Catalog" title={service.name} description="Edit what visitors see and what they pay at the shop." />
      <Panel><ServiceForm mode="edit" action={updateServiceAction.bind(null, slug)} initial={initial} /></Panel>
    </>
  );
}
