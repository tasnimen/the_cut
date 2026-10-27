import { SiteFrame } from "@/components/layout/SiteFrame";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";
import { MarketingPageHero } from "@/features/marketing/components/MarketingPageHero";

export const metadata = {
  title: `Pricing | ${site.name}`,
  description: "Explore example grooming package tiers. Confirmed service inclusions and prices are not available yet.",
  alternates: { canonical: ROUTES.pricing },
  openGraph: { title: `Pricing | ${site.name}`, description: "Example grooming package tiers; final menu and pricing are pending.", type: "website" },
};

const packageTiers = [
  { name: "Basic", note: "A simple starting point for a considered cut." },
  { name: "Standard", note: "A balanced package concept for everyday grooming.", featured: true },
  { name: "Premium", note: "A fuller grooming experience, with details to be confirmed." },
];

export default function PricingPage() {
  return (
    <SiteFrame activePath={ROUTES.pricing}>
      <MarketingPageHero
        description="A clear menu makes it easier to find the right kind of care. We're preparing the confirmed details."
        eyebrow="Our pricing"
        image="/images/banner2.png"
        imagePosition="right center"
        title={<>Packages for<br /><em>every gentleman.</em></>}
      />
      <section className="pricing-section page-shell" aria-labelledby="pricing-title">
        <div className="marketing-section-heading">
          <p className="eyebrow">Package concepts</p>
          <h2 id="pricing-title">Choose your <em>starting point.</em></h2>
          <p className="marketing-disclosure">Package names and descriptions below are illustrative. Final services, inclusions, durations, and prices have not been confirmed.</p>
        </div>
        <div className="pricing-grid">
          {packageTiers.map((tier) => (
            <article className={`pricing-card${tier.featured ? " pricing-card--featured" : ""}`} key={tier.name}>
              {tier.featured ? <span className="pricing-card-badge">Concept favorite</span> : null}
              <p className="eyebrow">Example package</p>
              <h3>{tier.name}</h3>
              <p>{tier.note}</p>
              <span className="pricing-pending">Price to be confirmed</span>
              <ButtonLink href={ROUTES.services} variant={tier.featured ? "primary" : "outline"} size="small">View service examples</ButtonLink>
            </article>
          ))}
        </div>
      </section>
    </SiteFrame>
  );
}
