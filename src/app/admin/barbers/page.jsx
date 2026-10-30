import Link from "next/link";
import { BarberActiveToggle } from "@/features/dashboard/barbers/BarberActiveToggle";
import { DataTable, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { listAdminBarbers } from "@/lib/catalog/admin-barbers";
import { WEEKDAYS } from "@/lib/catalog/barber-input";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";

export const metadata = { title: "Barbers | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function AdminBarbersPage() {
  await requireDashboardAccess("admin", { capability: "barbers.view" });
  const { db } = await getMongo();
  const barbers = await listAdminBarbers(db);
  const bookable = barbers.filter((barber) => barber.active && Object.keys(barber.weeklySchedule).length > 0 && barber.serviceSlugs.length > 0).length;
  const noHours = barbers.filter((barber) => barber.active && Object.keys(barber.weeklySchedule).length === 0).length;

  const rows = barbers.map((barber) => ({
    id: barber.slug,
    cells: {
      order: barber.displayOrder,
      name: <><strong>{barber.name}</strong><br /><small className="dash-muted">{barber.slug}</small></>,
      days: `${WEEKDAYS.filter((day) => barber.weeklySchedule[day]).length} days a week`,
      services: `${barber.serviceSlugs.length} services`,
      website: <span className={`dash-badge${barber.publicProfile ? "" : " is-off"}`}>{barber.publicProfile ? "Shown" : "Not shown"}</span>,
      status: <span className={`dash-badge${barber.active ? "" : " is-off"}`}>{barber.active ? "Bookable" : "Off"}</span>,
      actions: (
        <span className="dash-row-actions">
          <Link className="dash-link-button" href={`/admin/barbers/${barber.slug}`} aria-label={`Edit ${barber.name}`}>Edit</Link>
          <BarberActiveToggle slug={barber.slug} name={barber.name} active={barber.active} />
        </span>
      ),
    },
  }));

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Barbers"
        description="Who can be booked, when they work, and which services they offer. Clients only see time slots for barbers with working hours."
        actions={<Link className="button button-small" href="/admin/barbers/new"><span>New barber</span></Link>}
      />
      <div className="dash-stat-grid">
        <StatCard label="Bookable now" value={bookable} icon="razor" hint="Active, with hours and services" />
        <StatCard label="Active without working hours" value={noHours} icon="calendar" hint={noHours > 0 ? "These barbers have no time slots yet" : undefined} />
      </div>
      <Panel title="All barbers">
        <DataTable
          caption="Barbers"
          columns={[
            { key: "order", label: "Order" },
            { key: "name", label: "Barber" },
            { key: "days", label: "Hours" },
            { key: "services", label: "Services" },
            { key: "website", label: "On website" },
            { key: "status", label: "Booking" },
            { key: "actions", label: "Actions" },
          ]}
          rows={rows}
          emptyTitle="No barbers yet"
          emptyText="Create the first barber so clients can book."
        />
      </Panel>
    </>
  );
}
