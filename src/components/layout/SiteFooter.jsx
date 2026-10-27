import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-inner page-shell">
        <div className="footer-main">
          <div className="footer-brand-block">
            <BrandMark />
            <p>Good grooming.<br />Better company.</p>
          </div>
          <div className="footer-column">
            <h2>Explore</h2>
            <Link href="/#story">Our story</Link>
            <Link href="/services">Services</Link>
            <Link href="/#team">Our barbers</Link>
          </div>
          <div className="footer-column">
            <h2>Find us</h2>
            <span>Dhaka, Bangladesh</span>
            <span>Opening hours to be confirmed</span>
          </div>
          <div className="footer-cta">
            <p className="eyebrow">A little time for you</p>
            <h2>Come on in.</h2>
            <ButtonLink href="/booking" variant="outline" size="small">
              Book an appointment
            </ButtonLink>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© The Cut Barbershop</span>
          <span>Made for the love of a good cut.</span>
          <span>Policies to be published</span>
        </div>
      </div>
    </footer>
  );
}
