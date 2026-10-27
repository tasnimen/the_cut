import Image from "next/image";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function HeroSection() {
  return (
    <section className="hero" id="story" aria-labelledby="hero-title">
      <Image
        src="/images/banner1.png"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        preload
        className="hero-image"
      />
      <div className="hero-overlay" aria-hidden="true" />
      <div className="hero-content page-shell">
        <div className="hero-copy">
          <p className="eyebrow"><span /> The Cut Barbershop · Dhaka</p>
          <h1 id="hero-title">More than a<br /><em>haircut.</em></h1>
          <p className="hero-subtitle">It’s a lifestyle.</p>
          <p className="hero-description">
            Good grooming starts with good conversation. Settle in, take your
            time, and leave feeling like yourself — only sharper.
          </p>
          <div className="hero-actions">
            <ButtonLink href="/booking">Book an appointment</ButtonLink>
            <a className="text-link" href="#services">Explore our services <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-footnote"><span className="footnote-line" /> Thoughtful cuts. Good company.</div>
        </div>
        <div className="hero-caption"><span>THE CUT</span><span>DHAKA · BANGLADESH</span></div>
      </div>
    </section>
  );
}
