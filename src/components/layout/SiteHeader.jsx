import { BrandMark } from '@/components/ui/BrandMark';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { siteNavigation } from '@/components/layout/navigation';

export function SiteHeader({ activePath = "/" }) {
  return (
    <header className="site-header">
      <div className="header-inner page-shell">
        <BrandMark />
        <nav className="primary-nav" aria-label="Main navigation">
          {siteNavigation.map(([label, href]) => (
            <a
              className={href === activePath ? 'nav-active' : undefined}
              aria-current={href === activePath ? "page" : undefined}
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <ButtonLink href="/booking" size="small">
            Book a chair
          </ButtonLink>
          <MobileNavigation activePath={activePath} />
        </div>
      </div>
    </header>
  );
}
