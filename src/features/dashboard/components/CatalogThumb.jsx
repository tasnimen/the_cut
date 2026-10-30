import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { IMAGE_PRESETS } from "@/config/images";

// A small picture for the admin lists. A record with no picture shows its first letter, so every row looks the
// same and it is clear at a glance which ones still need a picture. A picture that fails to load falls back too.
export function CatalogThumb({ image, name }) {
  if (!image?.url) {
    return <span className="dash-thumb dash-thumb-empty" role="img" aria-label={`${name}: no picture yet`}>{String(name || "?").trim().charAt(0).toUpperCase() || "?"}</span>;
  }
  return (
    <span className="dash-thumb">
      <ImageWithFallback className="dash-thumb-image" src={image.url} alt={image.alt || `${name} picture`} width={IMAGE_PRESETS.avatar.width} height={IMAGE_PRESETS.avatar.height} sizes={IMAGE_PRESETS.avatar.sizes} />
    </span>
  );
}
