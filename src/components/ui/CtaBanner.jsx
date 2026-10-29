import { ButtonLink } from "@/components/ui/ButtonLink";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ROUTES } from "@/config/routes";
import { getImage } from "@/lib/images/server";

// Call-to-action band over the cta-background slot. Copy is deliberately offer-free:
// no discounts or promotions are shown until the owner defines real ones.
export function CtaBanner({
  eyebrow = "Ready when you are",
  title = "Book your appointment.",
  text = "Choose your service, barber, and a time that suits you.",
  href = ROUTES.booking,
  label = "Book Appointment",
}) {
  const image = getImage("cta-background");
  return (
    <section className="cta-banner page-shell" aria-labelledby="cta-banner-title">
      <ImageWithFallback src={image.src} alt={image.alt} fill sizes="(max-width: 1200px) 100vw, 1200px" className="cta-banner-image" style={{ objectPosition: image.objectPosition }} />
      <div className="cta-banner-overlay" aria-hidden="true" />
      <div className="cta-banner-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="cta-banner-title">{title}</h2>
        <p>{text}</p>
        <ButtonLink href={href}>{label}</ButtonLink>
      </div>
    </section>
  );
}
