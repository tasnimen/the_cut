import Link from "next/link";
import { ArchiveButton } from "@/features/dashboard/components/ArchiveButton";
import { ArchiveViewTabs, isArchivedView } from "@/features/dashboard/components/ArchiveViewTabs";
import { archiveBarberAction, restoreBarberAction } from "@/app/admin/barbers/actions";
import { BarberActiveToggle } from "@/features/dashboard/barbers/BarberActiveToggle";
import { CatalogThumb } from "@/features/dashboard/components/CatalogThumb";
import { DataTable, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { listAdminBarbers } from "@/lib/catalog/admin-barbers";
import { WEEKDAYS } from "@/lib/catalog/barber-input";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";

export const metadata = { title: "Barbers | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function AdminBarbersPage({ searchParams }) {
  const user = await requireDashboardAccess("admin", { capability: "barbers.view" });
  const can = await effectiveCapabilities(user.role);
  const { db } = await getMongo();
  const archived = isArchivedView(await searchParams);
  const barbers = await listAdminBarbers(db, { archived });
  const bookable = barbers.filter((barber) => barber.active && Object.keys(barber.weeklySchedule).length > 0 && barber.serviceSlugs.length > 0).length;
  const noHours = barbers.filter((barber) => barber.active && Object.keys(barber.weeklySchedule).length === 0).length;

  const rows = barbers.map((barber) => ({
    id: barber.slug,
    cells: {
      picture: <CatalogThumb image={barber.image} name={barber.name} />,
      order: barber.displayOrder,
      name: <><strong>{barber.name}</strong><br /><small className="dash-muted">{barber.slug}</small></>,
      days: `${WEEKDAYS.filter((day) => barber.weeklySchedule[day]).length} days a week`,
      services: `${barber.serviceSlugs.length} services`,
      website: <span className={`dash-badge${barber.publicProfile ? "" : " is-off"}`}>{barber.publicProfile ? "Shown" : "Not shown"}</span>,
      status: <span className={`dash-badge${barber.active && Object.keys(barber.weeklySchedule).length > 0 ? "" : " is-off"}`}>{barber.archived ? "Archived" : !barber.active ? "Off" : Object.keys(barber.weeklySchedule).length > 0 ? "Bookable" : "No hours"}</span>,
      actions: barber.archived ? (
        can["barbers.restore"] ? <ArchiveButton action={restoreBarberAction} slug={barber.slug} name={barber.name} restoring /> : <span className="dash-muted">View only</span>
      ) : can["barbers.edit"] || can["barbers.archive"] ? (
        <span className="dash-row-actions">
          {can["barbers.edit"] ? (
            <>
      <Link className="dash-link-button" href={`/admin/barbers/${barber.slug}`} aria-label={`Edit ${barber.name}`}>Edit</Link>
      <BarberActiveToggle slug={barber.slug} name={barber.name} active={barber.active} />
            </>
          ) : null}
          {can["barbers.archive"] ? <ArchiveButton action={archiveBarberAction} slug={barber.slug} name={barber.name} /> : null}
        </span>
      ) : <span className="dash-muted">View only</span>,
    },
  }));

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Barbers"
        description="Who can be booked, when they work, and which services they offer. Clients only see time slots for barbers with working hours."
        actions={can["barbers.create"] ? <Link className="button button-small" href="/admin/barbers/new"><span>New barber</span></Link> : undefined}
      />
      {archived ? null : (
        <div className="dash-stat-grid">
          <StatCard label="Bookable now" value={bookable} icon="razor" hint="Active, with hours and services" />
          <StatCard label="Active without working hours" value={noHours} icon="calendar" hint={noHours > 0 ? "These barbers have no time slots yet" : undefined} />
        </div>
      )}
      <ArchiveViewTabs basePath="/admin/barbers" archived={archived} />
      <Panel title={archived ? "Archived barbers" : "All barbers"}>
        <DataTable
          caption="Barbers"
          columns={[
            { key: "picture", label: "Picture" },
            { key: "order", label: "Order" },
            { key: "name", label: "Barber" },
            { key: "days", label: "Hours" },
            { key: "services", label: "Services" },
            { key: "website", label: "On website" },
            { key: "status", label: "Booking" },
            { key: "actions", label: "Actions" },
          ]}
          rows={rows}
          emptyTitle={archived ? "Nothing archived" : "No barbers yet"}
          emptyText={archived ? "Archived barbers appear here and can be restored." : "Create the first barber so clients can book."}
        />
      </Panel>
    </>
  );
}
