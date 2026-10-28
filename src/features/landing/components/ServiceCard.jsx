import { ButtonLink } from "@/components/ui/ButtonLink";
import { CardImage } from "@/components/ui/CardImage";
import { TiltSurface } from "@/components/ui/TiltSurface";
import { sharedCardImage } from "@/features/landing/data/cardImage";
import { ROUTES } from "@/config/routes";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function ServiceCard({
  service,
  imageSrc = sharedCardImage.src,
  imageAlt = sharedCardImage.alt,
  actionHref = ROUTES.booking,
  actionLabel = "Find your fit",
}) {
  return (
    <TiltSurface as="article" className="service-card">
      <CardImage src={imageSrc} alt={imageAlt} className="service-card-image" />
      <div>
        <span className="service-number">{service.number} / SERVICE</span>
        <h3>{service.name}</h3>
        <p>{service.detail}</p>
        <p className="service-card-price">{money.format(service.priceMinorUnits / 100)} · {service.durationMinutes} minutes before tax</p>
      </div>
      {actionHref ? (
        <ButtonLink href={actionHref} variant="outline" size="card">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </TiltSurface>
  );
}
