import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { getImage } from "@/lib/images/server";
import { SiteFrame } from "@/components/layout/SiteFrame";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCatalog } from "@/features/services/components/ServiceCatalog";
import { services } from "@/features/landing/data/services";
import { ANCHORS, ROUTES } from "@/config/routes";
import { site } from "@/config/site";

export const metadata = {
  title: `Services | ${site.name}`,
  description: `Haircuts, beard trims, shaves, color and treatments at ${site.name}. Prices in USD, before tax.`,
};

export default function ServicesPage() {
  return (
    <SiteFrame activePath={ROUTES.services}>
        <section className="services-hero" aria-labelledby="services-page-title">
          <ImageWithFallback
            src={getImage("hero-services").src}
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
              <p>Premium grooming services designed to keep you looking sharp, confident, and fresh.</p>
          <ButtonLink href={ROUTES.serviceCatalog} variant="outline">Explore the menu</ButtonLink>
            </div>
          </div>
        </section>

        <section className="section page-shell services-page-section" id={ANCHORS.serviceCatalog} aria-labelledby="service-catalog-title">
          <SectionHeading
            eyebrow="The menu"
            id="service-catalog-title"
          >
            Find your <em>kind of care.</em>
          </SectionHeading>
          <p className="service-menu-disclosure">
            Prices are in USD, before tax. Payment is at the shop.
          </p>
          <ServiceCatalog images={Object.fromEntries(services.map((service) => [service.slug, getImage(`service-${service.slug}`)]))} />
        </section>

        <section className="services-page-note page-shell" aria-label="Service information">
          <div>
            <p className="eyebrow">A little more time for you</p>
            <h2>Good grooming starts with a conversation.</h2>
            <p>Book online in a few steps: choose your services, your barber, and a time that suits you.</p>
          </div>
        </section>
        <CtaBanner />
    </SiteFrame>
  );
}
