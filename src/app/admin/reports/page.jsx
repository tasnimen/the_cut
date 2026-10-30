import Link from "next/link";
import { BOOKING_CONFIG } from "@/config/booking";
import { DataTable, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { BarList } from "@/features/dashboard/reports/BarList";
import { requirePrincipal } from "@/lib/auth/authorization";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { REPORT_RANGES, loadOperationalReport, parseReportRange } from "@/lib/reports/operational";

export const metadata = { title: "Reports | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

const DAY = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const rate = (value) => (value === null ? "No data" : `${value}%`);

export default async function AdminReportsPage({ searchParams }) {
  await requireDashboardAccess("admin", { capability: "reports.view" });
  await requirePrincipal("operationalReportsAll");
  const rangeKey = parseReportRange(await searchParams);
  const { db } = await getMongo();
  const report = await loadOperationalReport(db, { rangeKey, timeZone: BOOKING_CONFIG.timeZone });
  const dayText = (date) => DAY.format(new Date(`${date}T12:00:00Z`));

  const barberRows = report.barbers.map((barber) => ({
    id: barber.name,
    cells: { name: barber.name, booked: String(barber.booked), completed: String(barber.completed), noShow: String(barber.noShow) },
  }));

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description={`Bookings from ${dayText(report.firstDate)} to ${dayText(report.lastDate)} (Eastern time). Counts and rates only: money reports are for the Super Admin.`}
        actions={(
          <span className="dash-row-actions">
            {Object.entries(REPORT_RANGES).map(([key, range]) => (
              <Link key={key} className={`button button-small${key === rangeKey ? "" : " button-outline"}`} href={`/admin/reports?range=${key}`} aria-current={key === rangeKey ? "page" : undefined}><span>{range.label}</span></Link>
            ))}
          </span>
        )}
      />
      <div className="dash-stat-grid">
        <StatCard label="Bookings" value={report.total} icon="calendar" hint={`${report.source.online} online, ${report.source.walkIn} walk-in`} />
        <StatCard label="Completed" value={report.status.completed} icon="scissors" />
        <StatCard label="No-show rate" value={rate(report.rates.noShow)} icon="shield" hint="Of visits that were completed or missed" />
        <StatCard label="Cancellation rate" value={rate(report.rates.cancellation)} icon="inbox" />
        <StatCard label="New customers" value={report.newCustomers} icon="users" hint="Accounts created in this period" />
      </div>
      <Panel title="Status">
        <BarList label="Bookings by status" rows={[
          { label: "Confirmed or pending", n: report.status.confirmed + report.status.pending },
          { label: "Completed", n: report.status.completed },
          { label: "Cancelled", n: report.status.cancelled },
          { label: "No-show", n: report.status.noShow },
        ]} />
      </Panel>
      <Panel title="Barbers">
        <DataTable
          caption="Bookings per barber (cancelled bookings are not counted)"
          columns={[{ key: "name", label: "Barber" }, { key: "booked", label: "Booked" }, { key: "completed", label: "Completed" }, { key: "noShow", label: "No-shows" }]}
          rows={barberRows}
          emptyTitle="No bookings in this period"
          emptyText="Pick a longer range or check back after bookings are made."
        />
      </Panel>
      <Panel title="Most booked services"><BarList label="Most booked services" rows={report.services.map((service) => ({ label: service.name, n: service.n }))} /></Panel>
      <Panel title="Busiest days"><BarList label="Bookings by weekday" rows={report.weekdays} /></Panel>
      <Panel title="Busiest hours"><BarList label="Bookings by start hour" rows={report.hours} /></Panel>
    </>
  );
}
