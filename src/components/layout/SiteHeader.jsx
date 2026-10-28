import Link from "next/link";
import { BrandMark } from '@/components/ui/BrandMark';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { siteNavigation } from '@/config/navigation';
import { ROUTES } from '@/config/routes';

export function SiteHeader({ activePath = ROUTES.home, variant = "overlay" }) {
  return (
    <header className={`site-header site-header--${variant}`}>
      <div className="header-inner page-shell">
        <BrandMark />
        <nav className="primary-nav" aria-label="Main navigation">
          {siteNavigation.map(([label, href]) => (
            <Link
              className={href === activePath ? 'nav-active' : undefined}
              aria-current={href === activePath ? "page" : undefined}
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="header-account-link" href={ROUTES.signIn}>Sign in</Link>
          <ButtonLink href={ROUTES.booking} size="small">
            Book a chair
          </ButtonLink>
          <MobileNavigation activePath={activePath} />
        </div>
      </div>
    </header>
  );
}
