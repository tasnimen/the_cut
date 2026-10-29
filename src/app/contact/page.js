import { SiteFrame } from "@/components/layout/SiteFrame";
import { primeSlotOverrides } from "@/lib/images/slot-overrides";
import { getImage } from "@/lib/images/server";
import { ContactInfoCard, MapCard, OpeningHoursCard } from "@/components/contact/ContactInfo";
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

export default async function ContactPage() {
  await primeSlotOverrides();
  const formTicket = createContactFormTicket({ secret: requireEnv("BETTER_AUTH_SECRET") });
  return (
    <SiteFrame activePath={ROUTES.contact}>
      <MarketingPageHero
        description="Send a message to the team and we’ll get back to you as soon as we can."
        eyebrow="Get in touch"
        image={getImage("hero-contact")}
        title={<>Let’s start<br /><em>a conversation.</em></>}
      />
      <div className="contact-layout page-shell">
        <div className="contact-layout-info">
          <ContactInfoCard />
          <MapCard />
          <OpeningHoursCard />
        </div>
        <ContactForm captchaSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} formTicket={formTicket} />
      </div>
    </SiteFrame>
  );
}
