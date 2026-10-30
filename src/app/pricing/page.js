import { SiteFrame } from "@/components/layout/SiteFrame";
import { primeSlotOverrides } from "@/lib/images/slot-overrides";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { IMAGE_PRESETS } from "@/config/images";
import { getImage } from "@/lib/images/server";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";
import { getPublicPackages } from "@/lib/catalog/source";
import { formatMoney } from "@/lib/format/money";
import { bookingHrefForPackage } from "@/lib/booking/preselect";
import { MarketingPageHero } from "@/features/marketing/components/MarketingPageHero";

export const metadata = {
  title: `Pricing | ${site.name}`,
  description: "Grooming packages from The Cut, with prices in USD before tax.",
  alternates: { canonical: ROUTES.pricing },
  openGraph: { title: `Pricing | ${site.name}`, description: "Grooming packages with prices in USD before tax.", type: "website" },
};

export default async function PricingPage() {
  await primeSlotOverrides();
  const packages = await getPublicPackages();
  return (
    <SiteFrame activePath={ROUTES.pricing}>
      <MarketingPageHero
        description="Choose the perfect package for your style and grooming needs."
        eyebrow="Our pricing"
        image={getImage("hero-pricing")}
        title={<>Premium packages<br /><em>for every gentleman.</em></>}
      />
      <section className="pricing-section page-shell" aria-labelledby="pricing-title">
        <h2 id="pricing-title" className="sr-only">Packages</h2>
        <div className="pricing-grid">
          {packages.map((tier) => (
            <article className={`pricing-card${tier.featured ? " pricing-card--featured" : ""}`} key={tier.slug}>
              {tier.image ? (
                <div className="pricing-card-image">
                  <ImageWithFallback src={tier.image.url} alt={tier.image.alt} fill sizes={IMAGE_PRESETS["package-card"].sizes} />
                </div>
              ) : null}
              {tier.featured ? <span className="pricing-card-badge">Popular</span> : null}
              <h3>{tier.name}</h3>
              <p className="pricing-price">{formatMoney(tier.priceMinorUnits)}</p>
              <p>{tier.note}</p>
              <ul className="pricing-inclusions">
                {tier.inclusions.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <ButtonLink href={bookingHrefForPackage(tier.slug)} variant="primary" size="small">Book Now</ButtonLink>
            </article>
          ))}
        </div>
        <p className="pricing-note">Prices are in USD, before tax. Payment is at the shop.</p>
      </section>
    </SiteFrame>
  );
}
