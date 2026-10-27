"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { siteNavigation } from "@/config/navigation";
import { ROUTES } from "@/config/routes";

export function MobileNavigation({ activePath = ROUTES.home }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigationRef = useRef(null);
  const toggleRef = useRef(null);

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
      </nav>
    </div>
  );
}
