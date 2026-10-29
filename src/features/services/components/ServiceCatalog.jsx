"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { ServiceCard } from "@/features/landing/components/ServiceCard";
import { bookingHrefForService } from "@/lib/booking/preselect";

const categories = [
  { id: "all", label: "All Services" },
  { id: "haircut", label: "Haircut" },
  { id: "beard", label: "Beard" },
  { id: "shave", label: "Shave" },
  { id: "color", label: "Color" },
  { id: "treatment", label: "Treatment" },
];

export function ServiceCatalog({ services = [], images = {} }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const visibleServices = activeCategory === "all"
    ? services
    : services.filter((service) => service.category === activeCategory);

  return (
    <>
      <div className="service-category-list" role="group" aria-label="Filter services">
        {categories.map((category) => (
          <button
            className={`service-category${activeCategory === category.id ? " is-active" : ""}`}
            type="button"
            key={category.id}
            aria-pressed={activeCategory === category.id}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>
      <ScrollReveal className="service-grid service-catalog-grid" stagger>
        {visibleServices.map((service) => (
          <ServiceCard key={service.number} service={service} imageSrc={images[service.slug]?.src} imageAlt={images[service.slug]?.alt} actionHref={bookingHrefForService(service.slug)} actionLabel="Book Now" />
        ))}
      </ScrollReveal>
      <p className="service-image-disclosure">
        The same supplied sample image is used across these cards while service photography is pending.
      </p>
    </>
  );
}
