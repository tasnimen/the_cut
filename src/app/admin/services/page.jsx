import Link from "next/link";
import { DataTable, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { ServiceActiveToggle } from "@/features/dashboard/services/ServiceActiveToggle";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { formatMoney } from "@/lib/format/money";

export const metadata = { title: "Services | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function AdminServicesPage() {
  await requireDashboardAccess("admin", { capability: "services.view" });
  const { db } = await getMongo();
  const services = await listAdminServices(db);
  const activeCount = services.filter((service) => service.active).length;

  const rows = services.map((service) => ({
    id: service.slug,
    cells: {
      order: service.displayOrder,
      name: <><strong>{service.name}</strong><br /><small className="dash-muted">{service.slug}</small></>,
      category: service.category,
      price: service.priceMinorUnits === null ? "Not set" : formatMoney(service.priceMinorUnits),
      duration: `${service.durationMinutes} min`,
      status: <span className={`dash-badge${service.active ? "" : " is-off"}`}>{service.active ? "Shown" : "Hidden"}</span>,
      actions: (
        <span className="dash-row-actions">
          <Link className="dash-link-button" href={`/admin/services/${service.slug}`} aria-label={`Edit ${service.name}`}>Edit</Link>
          <ServiceActiveToggle slug={service.slug} name={service.name} active={service.active} />
        </span>
      ),
    },
  }));

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Services"
        description="What visitors see and can book. Changes appear on the public site within seconds."
        actions={<Link className="button button-small" href="/admin/services/new"><span>New service</span></Link>}
      />
      <div className="dash-stat-grid">
        <StatCard label="Shown on the site" value={activeCount} icon="scissors" />
        <StatCard label="Hidden" value={services.length - activeCount} icon="shield" />
      </div>
      <Panel title="All services">
        <DataTable
          caption="Services"
          columns={[
            { key: "order", label: "Order" },
            { key: "name", label: "Service" },
            { key: "category", label: "Category" },
            { key: "price", label: "Price" },
            { key: "duration", label: "Duration" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions" },
          ]}
          rows={rows}
          emptyTitle="No services yet"
          emptyText="Create the first service to show it on the site."
        />
      </Panel>
    </>
  );
}
