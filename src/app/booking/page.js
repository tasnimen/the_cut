import { Suspense } from "react";
import { connection } from "next/server";
import { SiteFrame } from "@/components/layout/SiteFrame";
import { BookingForm } from "@/features/booking/components/BookingForm";
import { ReviewsSection } from "@/features/landing/sections/ReviewsSection";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";

export const metadata = {
  title: `Plan a Visit | ${site.name}`,
  description: "Preview the appointment request flow. Online booking and availability are not connected yet.",
};

async function BookingFormForToday() {
  await connection();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return <BookingForm today={today} />;
}

export default function BookingPage() {

  return (
    <SiteFrame activePath={ROUTES.booking} headerVariant="flow">
        <section className="booking-intro page-shell" aria-labelledby="booking-page-title">
          <p className="eyebrow">Book appointment</p>
          <h1 id="booking-page-title">Schedule Your Visit</h1>
          <p>Choose your service, barber preference, and preferred visit time.</p>
        </section>

        <section className="booking-section page-shell" aria-label="Appointment request form">
          <Suspense fallback={<p className="booking-loading" role="status">Preparing appointment options…</p>}>
            <BookingFormForToday />
          </Suspense>
        </section>

        <ReviewsSection />
    </SiteFrame>
  );
}
