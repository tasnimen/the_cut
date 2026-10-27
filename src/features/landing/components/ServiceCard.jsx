import { ButtonLink } from "@/components/ui/ButtonLink";
import { CardImage } from "@/components/ui/CardImage";
import { sharedCardImage } from "@/features/landing/data/cardImage";

export function ServiceCard({
  service,
  imageSrc = sharedCardImage.src,
  imageAlt = sharedCardImage.alt,
  actionHref = "/booking",
  actionLabel = "Find your fit",
}) {
  return (
    <article className="service-card">
      <CardImage src={imageSrc} alt={imageAlt} className="service-card-image" />
      <div>
        <span className="service-number">{service.number} / SERVICE</span>
        <h3>{service.name}</h3>
        <p>{service.detail}</p>
      </div>
      {actionHref ? (
        <ButtonLink href={actionHref} variant="outline" size="card">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </article>
  );
}
