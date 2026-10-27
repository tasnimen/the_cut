import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ReviewCarousel } from "@/features/landing/components/ReviewCarousel";
import { ANCHORS } from "@/config/routes";

export function ReviewsSection() {
  return (
    <section className="section page-shell reviews-section" id={ANCHORS.reviews} aria-labelledby="reviews-title">
      <SectionHeading
        eyebrow="Notes from the chair"
        id="reviews-title"
        aside="Sample copy · approved reviews pending"
      >
        Good words, <em>well earned.</em>
      </SectionHeading>
      <ScrollReveal>
        <ReviewCarousel />
      </ScrollReveal>
    </section>
  );
}
