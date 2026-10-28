import { SiteFrame } from "@/components/layout/SiteFrame";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";
import { MarketingPageHero } from "@/features/marketing/components/MarketingPageHero";
import { ContactForm } from "@/components/contact/ContactForm";
import { createContactFormTicket } from "@/lib/contact/contact-core";
import { env, requireEnv } from "@/config/env";

export const metadata = {
  title: `Contact | ${site.name}`,
  description: "Send a message to The Cut Barbershop and ask about the services on offer.",
  alternates: { canonical: ROUTES.contact },
  openGraph: { title: `Contact | ${site.name}`, description: "Get in touch with The Cut Barbershop.", type: "website" },
};

export default function ContactPage() {
  const formTicket = createContactFormTicket({ secret: requireEnv("BETTER_AUTH_SECRET") });
  return (
    <SiteFrame activePath={ROUTES.contact}>
      <MarketingPageHero
        description="Send a message to the team and we’ll get back to you as soon as we can."
        eyebrow="Get in touch"
        image="/images/banner1.png"
        imagePosition="right center"
        title={<>Let’s start<br /><em>a conversation.</em></>}
      />
      <section className="contact-preview page-shell" aria-labelledby="contact-title">
        <div>
          <p className="eyebrow">Contact information</p>
          <h2 id="contact-title">We’re getting the details <em>in place.</em></h2>
          <p>Phone, email, address, and opening hours are still being confirmed before publication.</p>
          <p>Use the message form below for questions and follow-up requests.</p>
          <ButtonLink href={ROUTES.services} variant="outline">Explore services</ButtonLink>
        </div>
        <div className="contact-preview-image" role="img" aria-label="Concept image of a barbershop interior" />
      </section>
      <ContactForm captchaSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} formTicket={formTicket} />
    </SiteFrame>
  );
}
