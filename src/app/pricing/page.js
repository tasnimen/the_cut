import { SiteFrame } from "@/components/layout/SiteFrame";
import { getImage } from "@/lib/images/server";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";
import { PRICING_PACKAGES } from "@/config/pricing-packages";
import { formatMoney } from "@/lib/format/money";
import { bookingHrefForPackage } from "@/lib/booking/preselect";
import { MarketingPageHero } from "@/features/marketing/components/MarketingPageHero";

export const metadata = {
  title: `Pricing | ${site.name}`,
  description: "Grooming packages from The Cut, with prices in USD before tax.",
  alternates: { canonical: ROUTES.pricing },
  openGraph: { title: `Pricing | ${site.name}`, description: "Grooming packages with prices in USD before tax.", type: "website" },
};

export default function PricingPage() {
  return (
    <SiteFrame activePath={ROUTES.pricing}>
      <MarketingPageHero
        description="A clear menu makes it easier to find the right kind of care. Prices are in USD, before tax."
        eyebrow="Our pricing"
        image={getImage("hero-pricing")}
        title={<>Packages for<br /><em>every gentleman.</em></>}
      />
      <section className="pricing-section page-shell" aria-labelledby="pricing-title">
        <div className="marketing-section-heading">
          <p className="eyebrow">Packages</p>
          <h2 id="pricing-title">Choose your <em>starting point.</em></h2>
          <p className="marketing-disclosure">Prices are in USD before tax. Pay at the shop.</p>
        </div>
        <div className="pricing-grid">
          {PRICING_PACKAGES.filter((tier) => tier.active).map((tier) => (
            <article className={`pricing-card${tier.featured ? " pricing-card--featured" : ""}`} key={tier.slug}>
              {tier.featured ? <span className="pricing-card-badge">Popular</span> : null}
              <h3>{tier.name}</h3>
              <p className="pricing-price">{formatMoney(tier.priceMinorUnits)}</p>
              <p>{tier.note}</p>
              <ul className="pricing-inclusions">
                {tier.inclusions.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <ButtonLink href={bookingHrefForPackage(tier.slug)} variant={tier.featured ? "primary" : "outline"} size="small">Book Now</ButtonLink>
            </article>
          ))}
        </div>
      </section>
    </SiteFrame>
  );
}
