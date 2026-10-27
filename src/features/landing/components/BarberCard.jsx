import { CardImage } from "@/components/ui/CardImage";
import { TiltSurface } from "@/components/ui/TiltSurface";
import { sharedCardImage } from "@/features/landing/data/cardImage";

export function BarberCard({
  barber,
  imageSrc = sharedCardImage.src,
  imageAlt = sharedCardImage.alt,
}) {
  return (
    <TiltSurface as="article" className="barber-card">
      <CardImage src={imageSrc} alt={imageAlt} className="barber-card-image" />
      <p className="shared-image-note">Shared sample image</p>
      <p className="barber-role">{barber.role}</p>
      <h3>{barber.focus}</h3>
    </TiltSurface>
  );
}
