import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

export function CardImage({
  src,
  alt = "",
  className = "",
  sizes = "(max-width: 560px) 50vw, (max-width: 980px) 34vw, 25vw",
}) {
  if (!src) return null;

  return (
    <div className={`card-image-frame ${className}`.trim()}>
      <ImageWithFallback src={src} alt={alt} fill sizes={sizes} className="card-image" />
    </div>
  );
}
