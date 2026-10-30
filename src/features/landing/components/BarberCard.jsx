import { CardImage } from "@/components/ui/CardImage";
import { TiltSurface } from "@/components/ui/TiltSurface";
import { sharedCardImage } from "@/features/landing/data/cardImage";

export function BarberCard({
  barber,
  imageSrc: imageSrcProp,
  imageAlt: imageAltProp,
  isOwnPicture = false,
}) {
  const imageSrc = imageSrcProp ?? sharedCardImage.src;
  const imageAlt = imageAltProp ?? sharedCardImage.alt;
  return (
    <TiltSurface as="article" className="barber-card">
      <CardImage src={imageSrc} alt={imageAlt} className="barber-card-image" />
      {isOwnPicture ? null : <p className="shared-image-note">Shared sample image</p>}
      <p className="barber-role">{barber.role}</p>
      <h3>{barber.name ?? barber.focus}</h3>
      {barber.name && barber.focus ? <p className="barber-focus">{barber.focus}</p> : null}
    </TiltSurface>
  );
}
