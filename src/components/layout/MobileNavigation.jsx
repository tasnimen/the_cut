"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AccountIdentity, Avatar, useSessionNav } from "@/components/layout/HeaderAccount";
import { getAccountMenuItems, siteNavigation } from "@/config/navigation";
import { ROUTES } from "@/config/routes";

export function MobileNavigation({ activePath = ROUTES.home, initialUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigationRef = useRef(null);
  const toggleRef = useRef(null);
  const { status, user, signingOut, error, handleSignOut } = useSessionNav(initialUser);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    }

    function handleOutsidePointer(event) {
      if (!navigationRef.current?.contains(event.target)) setIsOpen(false);
    }

    function handleResize() {
      if (window.innerWidth > 760) setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handleOutsidePointer);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handleOutsidePointer);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  return (
    <div className="mobile-navigation" ref={navigationRef}>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-links"
        ref={toggleRef}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Icon name={isOpen ? "close" : "menu"} size={22} />
      </button>
      <nav
        className="mobile-nav-panel"
        id="mobile-navigation-links"
        aria-label="Mobile navigation"
        hidden={!isOpen}
      >
        {siteNavigation.map(([label, href]) => (
          <Link
            href={href}
            key={href}
            className={href === activePath ? "nav-active" : undefined}
            aria-current={href === activePath ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            {label}
          </Link>
        ))}
        <div className="mobile-nav-account-links">
          {status === "authenticated" && user ? (
            <>
              <div className="mobile-nav-identity"><Avatar user={user} /><AccountIdentity user={user} /></div>
              {getAccountMenuItems(user.role).map((item) => (
                <Link href={item.href} key={item.href} onClick={() => setIsOpen(false)}>{item.label}</Link>
              ))}
              <button
                type="button"
                className="mobile-nav-signout"
                disabled={signingOut}
                onClick={async () => { if (await handleSignOut()) setIsOpen(false); }}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : status === "loading" ? (
            <span aria-hidden="true" style={{ minHeight: 40 }} />
          ) : (
            <>
              <Link href={ROUTES.signIn} onClick={() => setIsOpen(false)}>Sign in</Link>
              <Link href={ROUTES.signUp} onClick={() => setIsOpen(false)}>Sign up</Link>
            </>
          )}
          {error ? <p className="header-account-error" role="alert">{error}</p> : null}
        </div>
      </nav>
    </div>
  );
}
