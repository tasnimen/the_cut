import Link from "next/link";
import { BookingActions } from "@/features/dashboard/bookings/BookingActions";
import { DataTable, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { ADMIN_STATUS_LABELS, adminAllowedActions, summarizeDay } from "@/lib/booking/admin-bookings";
import { openBookingRepository } from "@/lib/booking/service";
import { addLocalCalendarDays, businessDate, isValidLocalDate } from "@/lib/booking/time";
import { formatMoney } from "@/lib/format/money";

export const metadata = { title: "Bookings | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

const DAY_LABEL = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const TIME_LABEL = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

export default async function AdminBookingsPage({ searchParams }) {
  await requireDashboardAccess("admin");
  const { repository, config } = await openBookingRepository();
  const now = new Date();
  const today = businessDate(now, config.timeZone);
  const requested = (await searchParams)?.date;
  const date = typeof requested === "string" && isValidLocalDate(requested) ? requested : today;

  const bookings = await repository.adminListDay({ localDate: date });
  const summary = summarizeDay(bookings);

  const rows = bookings.map((booking) => ({
    id: booking.id,
    cells: {
      time: <strong>{TIME_LABEL.format(new Date(booking.startsAt))}</strong>,
      customer: <>{booking.customerName}{booking.source === "walk-in" ? <> <span className="dash-badge is-off">Walk-in</span></> : null}<br /><small className="dash-muted">{booking.phone}</small></>,
      services: booking.services.map((service) => service.name).join(" + "),
      barber: booking.barber.name,
      total: formatMoney(booking.totalPriceMinorUnits, booking.currency),
      status: <span className={`dash-badge${booking.status === "confirmed" || booking.status === "completed" ? "" : " is-off"}`}>{ADMIN_STATUS_LABELS[booking.status] ?? booking.status}</span>,
      actions: <BookingActions bookingId={booking.id} customer={booking.customerName} actions={adminAllowedActions(booking, { now, graceMinutes: config.lateArrivalGraceMinutes })} />,
    },
  }));

  const isToday = date === today;
  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title={isToday ? "Today's bookings" : "Bookings"}
        description={`${DAY_LABEL.format(new Date(`${date}T12:00:00Z`))} (Eastern time). Change a booking's status as the day goes on.`}
        actions={(
          <span className="dash-row-actions">
            <Link className="button button-small button-outline" href={`/admin/bookings?date=${addLocalCalendarDays(date, -1)}`}><span>Previous day</span></Link>
            {isToday ? null : <Link className="button button-small button-outline" href="/admin/bookings"><span>Today</span></Link>}
            <Link className="button button-small button-outline" href="/admin/bookings/all"><span>All bookings</span></Link>
            <Link className="button button-small" href="/admin/bookings/walk-in"><span>New walk-in</span></Link>
            <Link className="button button-small button-outline" href={`/admin/bookings?date=${addLocalCalendarDays(date, 1)}`}><span>Next day</span></Link>
          </span>
        )}
      />
      <div className="dash-stat-grid">
        <StatCard label="Bookings" value={summary.total} icon="calendar" />
        <StatCard label="Still to come or in progress" value={summary.active} icon="scissors" />
        <StatCard label="Completed" value={summary.counts.completed} icon="chart" />
        <StatCard label="Expected takings" value={summary.expected} icon="tag" hint="Confirmed and completed, paid at the shop" />
      </div>
      <Panel title="Pick a date">
        <form className="dash-form-row dash-date-form" method="get">
          <div className="dash-field">
            <label htmlFor="bookings-date">Date</label>
            <input id="bookings-date" name="date" type="date" defaultValue={date} required />
          </div>
          <div className="dash-form-actions"><button className="button button-small" type="submit"><span>Show day</span></button></div>
        </form>
      </Panel>
      <Panel title={isToday ? "Today" : "This day"}>
        <DataTable
          caption="Bookings for the day"
          columns={[
            { key: "time", label: "Time" },
            { key: "customer", label: "Customer" },
            { key: "services", label: "Services" },
            { key: "barber", label: "Barber" },
            { key: "total", label: "Total" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions" },
          ]}
          rows={rows}
          emptyTitle="No bookings on this day"
          emptyText="New bookings appear here as customers book."
        />
      </Panel>
    </>
  );
}
