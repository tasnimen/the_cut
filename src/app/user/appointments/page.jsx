import { EmptyState, PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { AppointmentCard } from "@/features/dashboard/user/AppointmentCard";
import { AppointmentHistory } from "@/features/dashboard/user/AppointmentHistory";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { loadMyBookings } from "@/lib/booking/my-bookings";

export const metadata = { title: "My appointments | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function UserAppointmentsPage() {
  const principal = await requireDashboardAccess("user");
  const { upcoming, history, today, cutoffHours } = await loadMyBookings(principal);

  return (
    <>
      <PageHeader eyebrow="My account" title="My appointments" description={`You can reschedule or cancel up to ${cutoffHours} hours before an appointment.`} actions={<a className="button button-small" href="/booking"><span>Book appointment</span></a>} />
      <Panel title="Upcoming">
        {upcoming.length === 0 ? (
          <EmptyState icon="calendar" title="No upcoming appointments" text="When you book, your appointment shows up here." action={{ href: "/booking", label: "Book appointment" }} />
        ) : (
          <div className="dash-appointment-list">
            {upcoming.map(({ booking, options }) => (
              <AppointmentCard key={booking.id} booking={booking} canCancel={options.canCancel} canReschedule={options.canReschedule} today={today} cutoffHours={cutoffHours} />
            ))}
          </div>
        )}
      </Panel>
      <Panel title="History"><AppointmentHistory history={history} /></Panel>
    </>
  );
}
