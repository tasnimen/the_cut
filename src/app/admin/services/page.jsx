import Link from "next/link";
import { ArchiveButton } from "@/features/dashboard/components/ArchiveButton";
import { ArchiveViewTabs, isArchivedView } from "@/features/dashboard/components/ArchiveViewTabs";
import { archiveServiceAction, restoreServiceAction } from "@/app/admin/services/actions";
import { CatalogThumb } from "@/features/dashboard/components/CatalogThumb";
import { DataTable, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { ServiceBookableToggle } from "@/features/dashboard/services/ServiceBookableToggle";
import { ServiceActiveToggle } from "@/features/dashboard/services/ServiceActiveToggle";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { formatMoney } from "@/lib/format/money";

export const metadata = { title: "Services | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function AdminServicesPage({ searchParams }) {
  const user = await requireDashboardAccess("admin", { capability: "services.view" });
  const can = await effectiveCapabilities(user.role);
  const { db } = await getMongo();
  const archived = isArchivedView(await searchParams);
  const services = await listAdminServices(db, { archived });
  const activeCount = services.filter((service) => service.active).length;

  const rows = services.map((service) => ({
    id: service.slug,
    cells: {
      picture: <CatalogThumb image={service.image} name={service.name} />,
      order: service.displayOrder,
      name: <><strong>{service.name}</strong><br /><small className="dash-muted">{service.slug}</small></>,
      category: service.category,
      price: service.priceMinorUnits === null ? "Not set" : formatMoney(service.priceMinorUnits),
      duration: `${service.durationMinutes} min`,
      status: <span className={`dash-badge${service.active ? "" : " is-off"}`}>{service.archived ? "Archived" : service.active ? "Shown" : "Hidden"}</span>,
      booking: service.archived ? "" : <span className={`dash-badge${service.bookable ? "" : " is-off"}`}>{service.bookable ? "Bookable" : "Not bookable"}</span>,
      actions: service.archived ? (
        can["services.restore"] ? <ArchiveButton action={restoreServiceAction} slug={service.slug} name={service.name} restoring /> : <span className="dash-muted">View only</span>
      ) : can["services.edit"] || can["services.archive"] || can["services.bookable"] ? (
        <span className="dash-row-actions">
          {can["services.edit"] ? (
            <>
      <Link className="dash-link-button" href={`/admin/services/${service.slug}`} aria-label={`Edit ${service.name}`}>Edit</Link>
      <ServiceActiveToggle slug={service.slug} name={service.name} active={service.active} />
            </>
          ) : null}
          {can["services.bookable"] ? <ServiceBookableToggle slug={service.slug} name={service.name} bookable={service.bookable} /> : null}
          {can["services.archive"] ? <ArchiveButton action={archiveServiceAction} slug={service.slug} name={service.name} /> : null}
        </span>
      ) : <span className="dash-muted">View only</span>,
    },
  }));

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Services"
        description="What visitors see and can book. Changes appear on the public site within seconds."
        actions={can["services.create"] ? <Link className="button button-small" href="/admin/services/new"><span>New service</span></Link> : undefined}
      />
      {archived ? null : (
        <div className="dash-stat-grid">
          <StatCard label="Shown on the site" value={activeCount} icon="scissors" />
          <StatCard label="Hidden" value={services.length - activeCount} icon="shield" />
        </div>
      )}
      <ArchiveViewTabs basePath="/admin/services" archived={archived} />
      <Panel title={archived ? "Archived services" : "All services"}>
        <DataTable
          caption="Services"
          columns={[
            { key: "picture", label: "Picture" },
            { key: "order", label: "Order" },
            { key: "name", label: "Service" },
            { key: "category", label: "Category" },
            { key: "price", label: "Price" },
            { key: "duration", label: "Duration" },
            { key: "status", label: "Status" },
            { key: "booking", label: "Booking" },
            { key: "actions", label: "Actions" },
          ]}
          rows={rows}
          emptyTitle={archived ? "Nothing archived" : "No services yet"}
          emptyText={archived ? "Archived services appear here and can be restored." : "Create the first service to show it on the site."}
        />
      </Panel>
    </>
  );
}
