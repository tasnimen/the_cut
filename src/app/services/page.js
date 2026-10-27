import Image from "next/image";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCatalog } from "@/features/services/components/ServiceCatalog";
import { ReviewsSection } from "@/features/landing/sections/ReviewsSection";

export const metadata = {
  title: "Services | The Cut Barbershop",
  description: "Explore the illustrative grooming services at The Cut Barbershop. Final menu and pricing are being confirmed.",
};

export default function ServicesPage() {
  return (
    <>
      <SiteHeader activePath="/services" />
      <main>
        <section className="services-hero" aria-labelledby="services-page-title">
          <Image
            src="/images/banner2.png"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            preload
            className="services-hero-image"
          />
          <div className="services-hero-overlay" aria-hidden="true" />
          <div className="services-hero-content page-shell">
            <div className="services-hero-copy">
              <p className="eyebrow">Our services</p>
              <h1 id="services-page-title">Expert care<br />for your <em>hair.</em></h1>
              <p>Considered cuts and grooming, shaped around the person in the chair.</p>
              <ButtonLink href="#service-catalog" variant="outline">Explore the menu</ButtonLink>
            </div>
          </div>
        </section>

        <section className="section page-shell services-page-section" id="service-catalog" aria-labelledby="service-catalog-title">
          <SectionHeading
            eyebrow="The menu"
            id="service-catalog-title"
            aside="Illustrative services · final menu and prices pending"
          >
            Find your <em>kind of care.</em>
          </SectionHeading>
          <p className="service-menu-disclosure">
            The service names and descriptions below are examples, not a confirmed shop menu. Final availability and prices have not been supplied.
          </p>
          <ServiceCatalog />
        </section>

        <section className="services-page-note page-shell" aria-label="Service information">
          <div>
            <p className="eyebrow">A little more time for you</p>
            <h2>Good grooming starts with a conversation.</h2>
            <p>The online booking flow and confirmed service details are still being prepared.</p>
          </div>
        </section>
        <ReviewsSection />
      </main>
      <SiteFooter />
    </>
  );
}
