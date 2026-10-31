import Link from "next/link";
import { bookAgainHref } from "@/lib/booking/snapshot";
import { DataTable } from "@/features/dashboard/components/primitives";
import { STATUS_LABELS } from "@/lib/booking/user-bookings";
import { formatMoney } from "@/lib/format/money";

// Past and cancelled appointments as a table (server component). Shows an empty state when there are none.
export function AppointmentHistory({ history, limit }) {
  const shown = typeof limit === "number" ? history.slice(0, limit) : history;
  const rows = shown.map((booking) => ({
    id: booking.id,
    cells: {
      when: booking.localStart,
      services: booking.services.map((service) => service.name).join(" + "),
      barber: booking.barber.name,
      total: formatMoney(booking.totalPriceMinorUnits, booking.currency),
      again: <Link className="dash-link-button" href={bookAgainHref(booking)} aria-label={`Book again: ${booking.services.map((service) => service.name).join(" and ")}`}>Book again</Link>,
      status: <span className={`dash-badge${booking.status === "completed" ? "" : " is-off"}`}>{STATUS_LABELS[booking.status] ?? booking.status}</span>,
    },
  }));
  return (
    <DataTable
      caption="Visit history"
      columns={[
        { key: "when", label: "When" },
        { key: "services", label: "Services" },
        { key: "barber", label: "Barber" },
        { key: "total", label: "Total" },
        { key: "status", label: "Status" },
        { key: "again", label: "" },
      ]}
      rows={rows}
      emptyTitle="No past visits yet"
      emptyText="Your completed and cancelled appointments will appear here."
    />
  );
}
