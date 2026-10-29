import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { getImage } from "@/lib/images/server";
import { SiteFrame } from "@/components/layout/SiteFrame";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";
import { MarketingPageHero } from "@/features/marketing/components/MarketingPageHero";

export const metadata = {
  title: `About | ${site.name}`,
  description: "The ideas behind The Cut: thoughtful barbering, careful detail, and a little time well spent.",
  alternates: { canonical: ROUTES.about },
  openGraph: { title: `About | ${site.name}`, description: "Thoughtful barbering, careful detail, and a little time well spent.", type: "website" },
};

const principles = [
  { number: "01", title: "Listen first", text: "A good result begins with understanding what feels right for the person in the chair." },
  { number: "02", title: "Care in the details", text: "Shape, finish, and the small choices deserve the same attention as the cut itself." },
  { number: "03", title: "Make room to reset", text: "The chair should feel like a pause in the day, with time to settle in and feel at ease." },
];

export default function AboutPage() {
  const story = getImage("about-story");
  return (
    <SiteFrame activePath={ROUTES.about}>
      <MarketingPageHero
        description="A good cut is personal. The experience around it should be, too."
        eyebrow="About The Cut"
        image={getImage("hero-about")}
        title={<>The story behind<br /><em>The Cut.</em></>}
      >
        <ButtonLink href={ROUTES.services} variant="outline">Explore services</ButtonLink>
      </MarketingPageHero>
      <section className="marketing-story page-shell" aria-labelledby="about-story-title">
        <div className="marketing-story-image">
          <ImageWithFallback alt={story.alt} fill sizes="(max-width: 760px) 100vw, 45vw" src={story.src} />
        </div>
        <div className="marketing-story-copy">
          <p className="eyebrow">What we believe</p>
          <h2 id="about-story-title">Good grooming should feel like <em>your own.</em></h2>
          <p>The Cut is a barbershop concept built around thoughtful service, personal style, and the craft of a careful finish.</p>
          <p>Our story, team details, and shop history will be added when the business information is confirmed.</p>
        </div>
      </section>
      <section className="marketing-principles page-shell" aria-labelledby="principles-title">
        <div className="marketing-section-heading">
          <p className="eyebrow">The way we want every visit to feel</p>
          <h2 id="principles-title">A little care goes <em>a long way.</em></h2>
        </div>
        <div className="principle-grid">
          {principles.map((principle) => (
            <article className="principle-card" key={principle.number}>
              <span>{principle.number}</span>
              <h3>{principle.title}</h3>
              <p>{principle.text}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteFrame>
  );
}
