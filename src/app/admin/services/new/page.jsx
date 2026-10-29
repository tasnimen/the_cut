import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { ServiceForm } from "@/features/dashboard/services/ServiceForm";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { createServiceAction } from "@/app/admin/services/actions";

export const metadata = { title: "New service | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function NewServicePage() {
  await requireDashboardAccess("admin");
  const { db } = await getMongo();
  const existing = await listAdminServices(db);
  const nextOrder = existing.reduce((max, service) => Math.max(max, service.displayOrder), 0) + 1;
  const initial = { slug: "", name: "", description: "", price: "", durationMinutes: "30", displayOrder: String(Math.min(nextOrder, 999)), category: "haircut", icon: "scissors", active: true };

  return (
    <>
      <PageHeader eyebrow="Catalog" title="New service" description="Add a service to the public menu and the booking form." />
      <Panel><ServiceForm mode="create" action={createServiceAction} initial={initial} /></Panel>
    </>
  );
}
