import Link from "next/link";
import { DataTable, EmptyState, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { ImportDefaultsButton, PackageActiveToggle } from "@/features/dashboard/packages/PackageActions";
import { listAdminPackages } from "@/lib/catalog/admin-packages";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { formatMoney } from "@/lib/format/money";

export const metadata = { title: "Packages | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function AdminPackagesPage() {
  await requireDashboardAccess("admin", { capability: "packages.view" });
  const { db } = await getMongo();
  const packages = await listAdminPackages(db);
  const activeCount = packages.filter((pkg) => pkg.active).length;

  const rows = packages.map((pkg) => ({
    id: pkg.slug,
    cells: {
      order: pkg.displayOrder,
      name: <><strong>{pkg.name}</strong>{pkg.featured ? <span className="dash-badge"> Popular</span> : null}<br /><small className="dash-muted">{pkg.slug}</small></>,
      price: pkg.priceMinorUnits === null ? "Not set" : formatMoney(pkg.priceMinorUnits),
      items: `${pkg.inclusions.length} items`,
      status: <span className={`dash-badge${pkg.active ? "" : " is-off"}`}>{pkg.active ? "Shown" : "Hidden"}</span>,
      actions: (
        <span className="dash-row-actions">
          <Link className="dash-link-button" href={`/admin/packages/${pkg.slug}`} aria-label={`Edit ${pkg.name}`}>Edit</Link>
          <PackageActiveToggle slug={pkg.slug} name={pkg.name} active={pkg.active} />
        </span>
      ),
    },
  }));

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Pricing packages"
        description="The packages on the public pricing page. Package prices are separate from the service prices used for booking."
        actions={<Link className="button button-small" href="/admin/packages/new"><span>New package</span></Link>}
      />
      {packages.length === 0 ? (
        <Panel>
          <EmptyState
            icon="tag"
            title="Using the built-in packages"
            text="No packages are saved here yet, so the site shows its three built-in packages (Basic, Standard, Premium). Import them to edit them. Saving a new package without importing would replace the built-in ones."
          />
          <div className="dash-form-actions"><ImportDefaultsButton /></div>
        </Panel>
      ) : (
        <>
          <div className="dash-stat-grid">
            <StatCard label="Shown on the site" value={activeCount} icon="tag" />
            <StatCard label="Hidden" value={packages.length - activeCount} icon="shield" />
          </div>
          <Panel title="All packages">
            <DataTable
              caption="Pricing packages"
              columns={[
                { key: "order", label: "Order" },
                { key: "name", label: "Package" },
                { key: "price", label: "Price" },
                { key: "items", label: "Includes" },
                { key: "status", label: "Status" },
                { key: "actions", label: "Actions" },
              ]}
              rows={rows}
            />
          </Panel>
        </>
      )}
    </>
  );
}
