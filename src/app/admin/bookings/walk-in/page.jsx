import Link from "next/link";
import { WalkInForm } from "@/features/dashboard/bookings/WalkInForm";
import { EmptyState, PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { listAdminServices } from "@/lib/catalog/admin-services";
import { openBookingRepository } from "@/lib/booking/service";
import { businessDate } from "@/lib/booking/time";

export const metadata = { title: "Walk-in | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function AdminWalkInPage() {
  await requireDashboardAccess("admin", { capability: "bookings.walkIn" });
  const { db, config } = await openBookingRepository();
  const services = (await listAdminServices(db))
    .filter((service) => service.active && Number.isSafeInteger(service.priceMinorUnits) && service.priceMinorUnits > 0)
    .map((service) => ({ slug: service.slug, name: service.name, durationMinutes: service.durationMinutes, priceMinorUnits: service.priceMinorUnits }));

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Walk-in booking"
        description="Book a customer who is in the shop. They do not need an account, and no email or text is sent."
        actions={<Link className="button button-small button-outline" href="/admin/bookings"><span>Today&apos;s bookings</span></Link>}
      />
      <Panel title="New walk-in">
        {services.length === 0 ? (
          <EmptyState icon="scissors" title="No bookable services" text="Add an active service with a price first." action={{ href: "/admin/services", label: "Services" }} />
        ) : (
          <WalkInForm services={services} today={businessDate(new Date(), config.timeZone)} />
        )}
      </Panel>
    </>
  );
}
