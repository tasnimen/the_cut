import { site } from "@/config/site";
import { greetingFor } from "@/config/dashboard-nav";
import { EmptyState, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { AppointmentCard } from "@/features/dashboard/user/AppointmentCard";
import { AppointmentHistory } from "@/features/dashboard/user/AppointmentHistory";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { loadMyBookings } from "@/lib/booking/my-bookings";

export default async function UserOverviewPage() {
  const principal = await requireDashboardAccess("user");
  const { upcoming, history, today, cutoffHours } = await loadMyBookings(principal);
  const next = upcoming[0];
  const firstName = (principal.name || principal.email).split(/\s+/)[0];
  const completed = history.filter((booking) => booking.status === "completed").length;

  return (
    <>
      <PageHeader eyebrow="My account" title={`${greetingFor(new Date(), site.timeZone)}, ${firstName}`} description="Your appointments at The Cut." actions={<a className="button button-small" href="/booking"><span>Book appointment</span></a>} />
      <div className="dash-stat-grid">
        <StatCard label="Upcoming appointments" value={upcoming.length} icon="calendar" />
        <StatCard label="Completed visits" value={completed} icon="scissors" />
      </div>
      <Panel title="Next appointment" action={{ href: "/user/appointments", label: "All appointments" }}>
        {next ? (
          <AppointmentCard booking={next.booking} canCancel={next.options.canCancel} canReschedule={next.options.canReschedule} today={today} cutoffHours={cutoffHours} />
        ) : (
          <EmptyState icon="calendar" title="No upcoming appointment" text="Book a time that suits you. You pay at the shop." action={{ href: "/booking", label: "Book appointment" }} />
        )}
      </Panel>
      <Panel title="Recent visits" action={history.length > 5 ? { href: "/user/appointments", label: "View all" } : undefined}>
        <AppointmentHistory history={history} limit={5} />
      </Panel>
    </>
  );
}
