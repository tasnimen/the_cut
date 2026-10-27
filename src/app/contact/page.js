import { SiteFrame } from "@/components/layout/SiteFrame";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";
import { MarketingPageHero } from "@/features/marketing/components/MarketingPageHero";

export const metadata = {
  title: `Contact | ${site.name}`,
  description: "Contact details and message delivery for The Cut are being prepared; service information is available to preview.",
  alternates: { canonical: ROUTES.contact },
  openGraph: { title: `Contact | ${site.name}`, description: "Get in touch with The Cut Barbershop.", type: "website" },
};

export default function ContactPage() {
  return (
    <SiteFrame activePath={ROUTES.contact}>
      <MarketingPageHero
        description="We’d be glad to hear from you. Confirmed contact details will be shared here soon."
        eyebrow="Get in touch"
        image="/images/banner1.png"
        imagePosition="right center"
        title={<>Let’s start<br /><em>a conversation.</em></>}
      />
      <section className="contact-preview page-shell" aria-labelledby="contact-title">
        <div>
          <p className="eyebrow">Contact information</p>
          <h2 id="contact-title">We’re getting the details <em>in place.</em></h2>
          <p>Phone, email, address, and opening hours are being confirmed before publication.</p>
          <p>Message sending is not available yet. In the meantime, you can explore the example service menu.</p>
          <ButtonLink href={ROUTES.services} variant="outline">Explore services</ButtonLink>
        </div>
        <div className="contact-preview-image" role="img" aria-label="Concept image of a barbershop interior" />
      </section>
    </SiteFrame>
  );
}
