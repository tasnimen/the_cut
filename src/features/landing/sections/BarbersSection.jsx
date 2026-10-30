import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { BarberCard } from "@/features/landing/components/BarberCard";
import { ANCHORS, ROUTES } from "@/config/routes";
import { PLACEHOLDER_SRC } from "@/config/images";
import { getPublicBarbers } from "@/lib/catalog/source";
import { pictureFor } from "@/lib/catalog/image-input";
import { getImage } from "@/lib/images/server";

export async function BarbersSection() {
  const profiles = await getPublicBarbers();
  return (
    <section className="team-section" id={ANCHORS.team} aria-labelledby="team-title">
      <div className="page-shell team-layout">
        <div className="team-intro-visual">
          <ImageWithFallback
            src={getImage("team-intro").src}
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
          {profiles.map((barber) => {
            const image = pictureFor(barber, barber.photoSlot ? getImage(barber.photoSlot) : { src: PLACEHOLDER_SRC, alt: "" });
            return <BarberCard key={barber.key} barber={barber} imageSrc={image.src} imageAlt={image.alt} isOwnPicture={image.source === "upload"} />;
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
