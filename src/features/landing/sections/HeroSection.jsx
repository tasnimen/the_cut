import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { HeroDepth } from '@/components/three/HeroDepth';
import { ANCHORS, ROUTES } from '@/config/routes';
import { site } from '@/config/site';

export function HeroSection() {
  return (
    <section className="hero" id={ANCHORS.story} aria-labelledby="hero-title">
      <ImageWithFallback
        src="/images/banner1.png"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        preload
        className="hero-image"
      />
      <div className="hero-overlay" aria-hidden="true" />
      <HeroDepth />
      <div className="hero-content page-shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> {site.name} · {site.location.city}
          </p>
          <h1 id="hero-title">
            More than a<br />
            <em>haircut.</em>
          </h1>
          <p className="hero-subtitle">Itâ€™s a lifestyle.</p>
          <p className="hero-description">
            Good grooming starts with good conversation. Settle in, take your
            time, and leave feeling like yourself â€” only sharper.
          </p>
          <div className="hero-actions">
            <ButtonLink href={ROUTES.booking}>Book an appointment</ButtonLink>
            <a className="text-link" href={ROUTES.homeServices}>
              Explore our services <span aria-hidden="true hiden"></span>
            </a>
          </div>
          <div className="hero-footnote">
            <span className="footnote-line" /> Thoughtful cuts. Good company.
          </div>
        </div>
        <div className="hero-caption">
          <span>THE CUT</span>
          <span>DHAKA Â· BANGLADESH</span>
        </div>
      </div>
    </section>
  );
}
