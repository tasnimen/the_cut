import Link from "next/link";
import { BookingActions } from "@/features/dashboard/bookings/BookingActions";
import { DataTable, PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { ADMIN_STATUS_LABELS, adminAllowedActions, filtersToQueryString, parseBookingFilters } from "@/lib/booking/admin-bookings";
import { openBookingRepository } from "@/lib/booking/service";
import { isValidLocalDate } from "@/lib/booking/time";
import { formatMoney } from "@/lib/format/money";

export const metadata = { title: "All bookings | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });

export default async function AdminAllBookingsPage({ searchParams }) {
  await requireDashboardAccess("admin");
  const filters = parseBookingFilters(await searchParams, { isValidDate: isValidLocalDate });
  const { repository, config } = await openBookingRepository();
  const [result, barbers] = await Promise.all([repository.adminSearch({ filters }), repository.adminBarberOptions()]);
  const now = new Date();
  const filtered = Boolean(filters.q || filters.status || filters.barber || filters.from || filters.to);

  const rows = result.bookings.map((booking) => ({
    id: booking.id,
    cells: {
      when: <strong>{WHEN.format(new Date(booking.startsAt))}</strong>,
      customer: <>{booking.customerName}{booking.source === "walk-in" ? <> <span className="dash-badge is-off">Walk-in</span></> : null}<br /><small className="dash-muted">{booking.phone}</small></>,
      services: booking.services.map((service) => service.name).join(" + "),
      barber: booking.barber.name,
      total: formatMoney(booking.totalPriceMinorUnits, booking.currency),
      status: <span className={`dash-badge${booking.status === "confirmed" || booking.status === "completed" ? "" : " is-off"}`}>{ADMIN_STATUS_LABELS[booking.status] ?? booking.status}</span>,
      actions: <BookingActions bookingId={booking.id} customer={booking.customerName} actions={adminAllowedActions(booking, { now, graceMinutes: config.lateArrivalGraceMinutes })} />,
    },
  }));

  const from = (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.total, result.page * result.pageSize);

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="All bookings"
        description="Search by customer name, phone number or booking number, and filter by status, barber and date (Eastern time)."
        actions={<Link className="button button-small button-outline" href="/admin/bookings"><span>Today&apos;s bookings</span></Link>}
      />
      <Panel title="Search and filter">
        <form className="dash-form dash-filter-form" method="get">
          <div className="dash-form-row">
            <div className="dash-field">
              <label htmlFor="f-q">Search</label>
              <input id="f-q" name="q" type="search" maxLength={60} defaultValue={filters.q} placeholder="Name, phone or booking number" />
            </div>
            <div className="dash-field">
              <label htmlFor="f-status">Status</label>
              <select id="f-status" name="status" defaultValue={filters.status}>
                <option value="">Any status</option>
                {Object.entries(ADMIN_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="dash-field">
              <label htmlFor="f-barber">Barber</label>
              <select id="f-barber" name="barber" defaultValue={filters.barber}>
                <option value="">Any barber</option>
                {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
              </select>
            </div>
          </div>
          <div className="dash-form-row">
            <div className="dash-field">
              <label htmlFor="f-from">From date</label>
              <input id="f-from" name="from" type="date" defaultValue={filters.from} />
            </div>
            <div className="dash-field">
              <label htmlFor="f-to">To date</label>
              <input id="f-to" name="to" type="date" defaultValue={filters.to} />
            </div>
          </div>
          <div className="dash-form-actions">
            <button className="button button-small" type="submit"><span>Apply</span></button>
            {filtered ? <Link className="dash-link-button" href="/admin/bookings/all">Clear filters</Link> : null}
          </div>
        </form>
      </Panel>
      <Panel title={result.total === 0 ? "Results" : `Results (${from} to ${to} of ${result.total})`}>
        <DataTable
          caption="Bookings"
          columns={[
            { key: "when", label: "When" },
            { key: "customer", label: "Customer" },
            { key: "services", label: "Services" },
            { key: "barber", label: "Barber" },
            { key: "total", label: "Total" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions" },
          ]}
          rows={rows}
          emptyTitle={filtered ? "No bookings match" : "No bookings yet"}
          emptyText={filtered ? "Try a different search or clear the filters." : "New bookings appear here as customers book."}
        />
        {result.pages > 1 ? (
          <nav className="dash-pager" aria-label="Pages">
            {result.page > 1 ? <Link className="button button-small button-outline" href={`/admin/bookings/all${filtersToQueryString(filters, { page: result.page - 1 })}`} rel="prev"><span>Previous</span></Link> : <span />}
            <span className="dash-muted">Page {result.page} of {result.pages}</span>
            {result.page < result.pages ? <Link className="button button-small button-outline" href={`/admin/bookings/all${filtersToQueryString(filters, { page: result.page + 1 })}`} rel="next"><span>Next</span></Link> : <span />}
          </nav>
        ) : null}
      </Panel>
    </>
  );
}
