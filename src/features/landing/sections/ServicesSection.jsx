import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCard } from "@/features/landing/components/ServiceCard";
import { services } from "@/features/landing/data/services";
import Link from "next/link";
import { ANCHORS, ROUTES } from "@/config/routes";

export function ServicesSection() {
  return (
    <section className="section page-shell services-section" id={ANCHORS.services} aria-labelledby="services-title">
      <SectionHeading
        eyebrow="From classic cuts to modern styles"
        id="services-title"
        aside={<Link className="text-link" href={ROUTES.services}>View all services <span aria-hidden="true">→</span></Link>}
      >
        Our <em>services.</em>
      </SectionHeading>
      <ScrollReveal className="service-grid" stagger>
        {services.map((service) => (
          <ServiceCard
            key={service.number}
            service={service}
            actionHref={ROUTES.booking}
            actionLabel="Book Now"
          />
        ))}
      </ScrollReveal>
      <p className="section-footnote">Shared sample image shown · service photos pending</p>
    </section>
  );
}
