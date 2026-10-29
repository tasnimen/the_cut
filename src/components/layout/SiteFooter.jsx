import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ANCHORS, ROUTES } from "@/config/routes";
import { ContactDetails } from "@/components/layout/ContactDetails";

export function SiteFooter() {
  return (
    <footer className="site-footer" id={ANCHORS.contact}>
      <div className="footer-inner page-shell">
        <div className="footer-main">
          <div className="footer-brand-block">
            <BrandMark />
            <p>Good grooming.<br />Better company.</p>
          </div>
          <div className="footer-column">
            <h2>Explore</h2>
            <Link href={ROUTES.about}>Our story</Link>
            <Link href={ROUTES.services}>Services</Link>
            <Link href={ROUTES.gallery}>Gallery</Link>
            <Link href={ROUTES.pricing}>Pricing</Link>
            <Link href={ROUTES.team}>Our barbers</Link>
            <Link href={ROUTES.contact}>Contact</Link>
          </div>
          <div className="footer-column">
            <h2>Find us</h2>
            <ContactDetails />
          </div>
          <div className="footer-cta">
            <p className="eyebrow">A little time for you</p>
            <h2>Come on in.</h2>
            <ButtonLink href={ROUTES.booking} variant="outline" size="small">
              Book an appointment
            </ButtonLink>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© The Cut Barbershop</span>
          <span>Made for the love of a good cut.</span>
        </div>
      </div>
    </footer>
  );
}
