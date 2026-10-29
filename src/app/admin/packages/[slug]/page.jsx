import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { PackageForm } from "@/features/dashboard/packages/PackageForm";
import { getAdminPackage } from "@/lib/catalog/admin-packages";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { SERVICE_SLUG_PATTERN } from "@/lib/catalog/service-input";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { updatePackageAction } from "@/app/admin/packages/actions";

export const metadata = { title: "Edit package | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function EditPackagePage({ params }) {
  await requireDashboardAccess("admin");
  const { slug } = await params;
  if (!SERVICE_SLUG_PATTERN.test(slug)) notFound();
  const { db } = await getMongo();
  const [pkg, services] = await Promise.all([getAdminPackage(db, slug), listAdminServices(db)]);
  if (!pkg) notFound();

  const initial = {
    slug: pkg.slug,
    name: pkg.name,
    note: pkg.note,
    price: pkg.priceMinorUnits === null ? "" : (pkg.priceMinorUnits / 100).toFixed(2),
    inclusions: pkg.inclusions.join("\n"),
    displayOrder: String(pkg.displayOrder),
    featured: pkg.featured,
    active: pkg.active,
    bookingServiceSlugs: pkg.bookingServiceSlugs,
  };

  return (
    <>
      <PageHeader eyebrow="Catalog" title={pkg.name} description="Edit what visitors see on the pricing page." />
      <Panel><PackageForm mode="edit" action={updatePackageAction.bind(null, slug)} initial={initial} services={services.map((service) => ({ slug: service.slug, name: service.name }))} /></Panel>
    </>
  );
}
