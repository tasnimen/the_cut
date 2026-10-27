import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCard } from "@/features/landing/components/ServiceCard";
import { services } from "@/features/landing/data/services";

export function ServicesSection() {
  return (
    <section className="section page-shell services-section" id="services" aria-labelledby="services-title">
      <SectionHeading eyebrow="The good stuff" id="services-title" aside="Shared sample image · service photos pending">
        Care for your <em>kind of style.</em>
      </SectionHeading>
      <ScrollReveal className="service-grid" stagger>
        {services.map((service) => (
          <ServiceCard
            key={service.number}
            service={service}
            actionHref="/services"
            actionLabel="Explore services"
          />
        ))}
      </ScrollReveal>
    </section>
  );
}
