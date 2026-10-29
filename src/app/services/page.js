import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { SiteFrame } from "@/components/layout/SiteFrame";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCatalog } from "@/features/services/components/ServiceCatalog";
import { ReviewsSection } from "@/features/landing/sections/ReviewsSection";
import { ANCHORS, ROUTES } from "@/config/routes";
import { site } from "@/config/site";

export const metadata = {
  title: `Services | ${site.name}`,
  description: `Explore the illustrative grooming services at ${site.name}. Final menu and pricing are being confirmed.`,
};

export default function ServicesPage() {
  return (
    <SiteFrame activePath={ROUTES.services}>
        <section className="services-hero" aria-labelledby="services-page-title">
          <ImageWithFallback
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
          <ButtonLink href={ROUTES.serviceCatalog} variant="outline">Explore the menu</ButtonLink>
            </div>
          </div>
        </section>

        <section className="section page-shell services-page-section" id={ANCHORS.serviceCatalog} aria-labelledby="service-catalog-title">
          <SectionHeading
            eyebrow="The menu"
            id="service-catalog-title"
            aside="Prices in USD, before tax"
          >
            Find your <em>kind of care.</em>
          </SectionHeading>
          <p className="service-menu-disclosure">
            Prices are in USD before tax and are paid at the shop.
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
    </SiteFrame>
  );
}
