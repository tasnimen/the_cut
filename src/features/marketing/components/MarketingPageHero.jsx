import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

export function MarketingPageHero({ eyebrow, title, image, imagePosition, description, children }) {
  return (
    <section className="marketing-hero" aria-labelledby="marketing-page-title">
      <ImageWithFallback
        src={image.src}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        preload
        className="marketing-hero-image"
        style={{ objectPosition: imagePosition || image.objectPosition }}
      />
      <div className="marketing-hero-overlay" aria-hidden="true" />
      <div className="marketing-hero-content page-shell">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="marketing-page-title">{title}</h1>
        <p className="marketing-hero-description">{description}</p>
        {children ? <div className="marketing-hero-actions">{children}</div> : null}
      </div>
    </section>
  );
}
