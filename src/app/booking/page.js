import { Suspense } from "react";
import { connection } from "next/server";
import { SiteFrame } from "@/components/layout/SiteFrame";
import { BookingForm } from "@/features/booking/components/BookingForm";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";
import { resolvePreselect } from "@/lib/booking/preselect";
import { businessDate } from "@/lib/booking/time";

export const metadata = {
  title: `Plan a Visit | ${site.name}`,
  description: "Choose a service and an available time for your visit.",
};

async function BookingFormForToday({ searchParams }) {
  await connection();
  const initialServiceSlugs = resolvePreselect(await searchParams);
  const now = new Date();
  const today = businessDate(now, site.timeZone);
  return <BookingForm today={today} initialServiceSlugs={initialServiceSlugs} />;
}

export default function BookingPage({ searchParams }) {
  return (
    <SiteFrame activePath={ROUTES.booking} headerVariant="flow">
        <section className="booking-intro page-shell" aria-labelledby="booking-page-title">
          <p className="eyebrow">Book appointment</p>
          <h1 id="booking-page-title">Schedule Your Visit</h1>
          <p>Choose your service, barber, date and time, in just a few steps.</p>
        </section>

        <section className="booking-section page-shell" aria-label="Appointment request form">
          <Suspense fallback={<p className="booking-loading" role="status">Preparing appointment options…</p>}>
            <BookingFormForToday searchParams={searchParams} />
          </Suspense>
        </section>

    </SiteFrame>
  );
}
