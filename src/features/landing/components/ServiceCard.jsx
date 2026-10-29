import { ButtonLink } from "@/components/ui/ButtonLink";
import { CardImage } from "@/components/ui/CardImage";
import { TiltSurface } from "@/components/ui/TiltSurface";
import { sharedCardImage } from "@/features/landing/data/cardImage";
import { ROUTES } from "@/config/routes";
import { formatMoney } from "@/lib/format/money";


export function ServiceCard({
  service,
  imageSrc: imageSrcProp,
  imageAlt: imageAltProp,
  actionHref = ROUTES.booking,
  actionLabel = "Find your fit",
}) {
  const imageSrc = imageSrcProp ?? sharedCardImage.src;
  const imageAlt = imageAltProp ?? sharedCardImage.alt;
  return (
    <TiltSurface as="article" className="service-card">
      <CardImage src={imageSrc} alt={imageAlt} className="service-card-image" />
      <div>
        <span className="service-number">{service.number} / SERVICE</span>
        <h3>{service.name}</h3>
        <p>{service.detail}</p>
        <p className="service-card-price">{formatMoney(service.priceMinorUnits)} · {service.durationMinutes} minutes before tax</p>
      </div>
      {actionHref ? (
        <ButtonLink href={actionHref} variant="outline" size="card">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </TiltSurface>
  );
}
