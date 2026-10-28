import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { BarberCard } from "@/features/landing/components/BarberCard";
import { ANCHORS, ROUTES } from "@/config/routes";

const barberProfiles = [
  { number: 1, role: "Master Barber", focus: "Classic, considered cuts" },
  { number: 2, role: "Senior Barber", focus: "Texture and shape" },
  { number: 3, role: "Barber & Groomer", focus: "Beard and shave" },
];

export function BarbersSection() {
  return (
    <section className="team-section" id={ANCHORS.team} aria-labelledby="team-title">
      <div className="page-shell team-layout">
        <div className="team-intro-visual">
          <ImageWithFallback
            src="/images/banner2.png"
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 900px) 100vw, 38vw"
            className="team-intro-image"
          />
          <div className="team-intro-overlay" aria-hidden="true" />
          <div className="team-intro-copy">
            <p className="eyebrow">A good cut starts with a good barber</p>
            <h2 id="team-title">Meet the hands<br />behind <em>the craft.</em></h2>
            <p>Skilled, thoughtful, and always ready to listen. Our team brings care to every detail.</p>
            <ButtonLink href={ROUTES.teamProfiles} variant="outline">Meet the team</ButtonLink>
          </div>
          <span className="team-photo-caption">A PLACE FOR THE CRAFT</span>
        </div>
        <ScrollReveal className="barber-grid" id={ANCHORS.teamProfiles} stagger>
          {barberProfiles.map((barber) => <BarberCard key={barber.number} barber={barber} />)}
        </ScrollReveal>
      </div>
    </section>
  );
}
