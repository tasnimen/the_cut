import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCard } from "@/features/landing/components/ServiceCard";
import { getPublicServices } from "@/lib/catalog/source";
import Link from "next/link";
import { ANCHORS, ROUTES } from "@/config/routes";
import { bookingHrefForService } from "@/lib/booking/preselect";
import { getImage } from "@/lib/images/server";

export async function ServicesSection() {
  const services = await getPublicServices();
  return (
    <section className="section page-shell services-section" id={ANCHORS.services} aria-labelledby="services-title">
      <SectionHeading
        eyebrow="From classic cuts to modern styles"
        id="services-title"
        aside={<Link className="text-link" href={ROUTES.services}>View all services <span aria-hidden="true">→</span></Link>}
      >
        Our <em>services.</em>
      </SectionHeading>
      {services.length === 0 ? <p className="section-footnote">Services will be listed here soon.</p> : null}
      <ScrollReveal className="service-grid" stagger>
        {services.map((service) => {
          const image = getImage(`service-${service.slug}`);
          return (
          <ServiceCard
            key={service.number}
            service={service}
            imageSrc={image.src}
            imageAlt={image.alt}
            actionHref={bookingHrefForService(service.slug)}
            actionLabel="Book Now"
          />
          );
        })}
      </ScrollReveal>
      <p className="section-footnote">Shared sample image shown · service photos pending</p>
    </section>
  );
}
