import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { PackageForm } from "@/features/dashboard/packages/PackageForm";
import { listAdminPackages } from "@/lib/catalog/admin-packages";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { createPackageAction } from "@/app/admin/packages/actions";

export const metadata = { title: "New package | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function NewPackagePage() {
  await requireDashboardAccess("admin");
  const { db } = await getMongo();
  const [packages, services] = await Promise.all([listAdminPackages(db), listAdminServices(db)]);
  const nextOrder = packages.reduce((max, pkg) => Math.max(max, pkg.displayOrder), 0) + 1;
  const initial = { slug: "", name: "", note: "", price: "", inclusions: "", displayOrder: String(Math.min(nextOrder, 999)), featured: false, active: true, bookingServiceSlugs: [] };

  return (
    <>
      <PageHeader eyebrow="Catalog" title="New package" description="Add a package to the public pricing page." />
      <Panel><PackageForm mode="create" action={createPackageAction} initial={initial} services={services.map((service) => ({ slug: service.slug, name: service.name }))} /></Panel>
    </>
  );
}
