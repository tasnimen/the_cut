import Link from "next/link";
import { BrandMark } from '@/components/ui/BrandMark';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { HeaderAccount } from '@/components/layout/HeaderAccount';
import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { siteNavigation } from '@/config/navigation';
import { ROUTES } from '@/config/routes';
import { getHeaderUser } from '@/lib/auth/header-user';

export async function SiteHeader({ activePath = ROUTES.home, variant = "overlay" }) {
  // Read on the server so the first paint already has the right header state.
  const initialUser = await getHeaderUser();
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
          <HeaderAccount initialUser={initialUser} />
          <ButtonLink href={ROUTES.booking} size="small">
            Book Appointment
          </ButtonLink>
          <MobileNavigation activePath={activePath} initialUser={initialUser} />
        </div>
      </div>
    </header>
  );
}
