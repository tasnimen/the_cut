import Link from "next/link";
import { ArchiveButton } from "@/features/dashboard/components/ArchiveButton";
import { ArchiveViewTabs, isArchivedView } from "@/features/dashboard/components/ArchiveViewTabs";
import { archivePackageAction, restorePackageAction } from "@/app/admin/packages/actions";
import { DataTable, EmptyState, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { ImportDefaultsButton, PackageActiveToggle } from "@/features/dashboard/packages/PackageActions";
import { listAdminPackages } from "@/lib/catalog/admin-packages";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { formatMoney } from "@/lib/format/money";

export const metadata = { title: "Packages | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function AdminPackagesPage({ searchParams }) {
  const user = await requireDashboardAccess("admin", { capability: "packages.view" });
  const can = await effectiveCapabilities(user.role);
  const { db } = await getMongo();
  const archived = isArchivedView(await searchParams);
  const packages = await listAdminPackages(db, { archived });
  // The built-in-packages notice is only for a catalog that has no packages at all, archived ones included.
  const hasAny = packages.length > 0 || (await listAdminPackages(db, { archived: !archived })).length > 0;
  const activeCount = packages.filter((pkg) => pkg.active).length;

  const rows = packages.map((pkg) => ({
    id: pkg.slug,
    cells: {
      order: pkg.displayOrder,
      name: <><strong>{pkg.name}</strong>{pkg.featured ? <span className="dash-badge"> Popular</span> : null}<br /><small className="dash-muted">{pkg.slug}</small></>,
      price: pkg.priceMinorUnits === null ? "Not set" : formatMoney(pkg.priceMinorUnits),
      items: `${pkg.inclusions.length} items`,
      status: <span className={`dash-badge${pkg.active ? "" : " is-off"}`}>{pkg.archived ? "Archived" : pkg.active ? "Shown" : "Hidden"}</span>,
      actions: pkg.archived ? (
        can["packages.restore"] ? <ArchiveButton action={restorePackageAction} slug={pkg.slug} name={pkg.name} restoring /> : <span className="dash-muted">View only</span>
      ) : can["packages.edit"] || can["packages.archive"] ? (
        <span className="dash-row-actions">
          {can["packages.edit"] ? (
            <>
      <Link className="dash-link-button" href={`/admin/packages/${pkg.slug}`} aria-label={`Edit ${pkg.name}`}>Edit</Link>
      <PackageActiveToggle slug={pkg.slug} name={pkg.name} active={pkg.active} />
            </>
          ) : null}
          {can["packages.archive"] ? <ArchiveButton action={archivePackageAction} slug={pkg.slug} name={pkg.name} /> : null}
        </span>
      ) : <span className="dash-muted">View only</span>,
    },
  }));

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Pricing packages"
        description="The packages on the public pricing page. Package prices are separate from the service prices used for booking."
        actions={can["packages.create"] ? <Link className="button button-small" href="/admin/packages/new"><span>New package</span></Link> : undefined}
      />
      {!hasAny ? (
        <Panel>
          <EmptyState
            icon="tag"
            title="Using the built-in packages"
            text="No packages are saved here yet, so the site shows its three built-in packages (Basic, Standard, Premium). Import them to edit them. Saving a new package without importing would replace the built-in ones."
          />
          {can["packages.create"] ? <div className="dash-form-actions"><ImportDefaultsButton /></div> : null}
        </Panel>
      ) : (
        <>
          {archived ? null : (
            <div className="dash-stat-grid">
              <StatCard label="Shown on the site" value={activeCount} icon="tag" />
              <StatCard label="Hidden" value={packages.length - activeCount} icon="shield" />
            </div>
          )}
          <ArchiveViewTabs basePath="/admin/packages" archived={archived} />
          <Panel title={archived ? "Archived packages" : "All packages"}>
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
              emptyTitle={archived ? "Nothing archived" : "No packages here"}
              emptyText={archived ? "Archived packages appear here and can be restored." : "Every package is archived. Restore one from the Archived tab."}
            />
          </Panel>
        </>
      )}
    </>
  );
}
