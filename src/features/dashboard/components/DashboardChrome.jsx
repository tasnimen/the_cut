"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, useSessionNav } from "@/components/layout/HeaderAccount";
import { BrandMark } from "@/components/ui/BrandMark";
import { Icon } from "@/components/ui/Icon";
import { ROLE_LABELS } from "@/config/navigation";
import { breadcrumbsFor, isNavItemActive } from "@/config/dashboard-nav";
import { ROUTES } from "@/config/routes";

// Sidebar + top bar + mobile drawer. Receives serializable props from the server layout
// (the guard has already authorized the visitor; nothing here grants access).
export function DashboardChrome({ areaLabel, nav, principal, children }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);
  const toggleRef = useRef(null);
  const { signingOut, error, handleSignOut } = useSessionNav(principal);
  const crumbs = breadcrumbsFor(pathname);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); return; }
      if (event.key !== "Tab") return;
      const nodes = [...drawerRef.current.querySelectorAll("a[href], button:not(:disabled)")];
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    drawerRef.current?.querySelector("a[href]")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="dash-shell">
      <aside className={`dash-sidebar${open ? " is-open" : ""}`} ref={drawerRef} aria-label={`${areaLabel} navigation`}>
        <div className="dash-sidebar-brand"><BrandMark /></div>
        <nav className="dash-nav">
          {nav.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className={`dash-nav-link${isNavItemActive(entry, pathname) ? " is-active" : ""}`}
              aria-current={isNavItemActive(entry, pathname) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon name={entry.icon} size={18} />
              <span>{entry.label}</span>
            </Link>
          ))}
        </nav>
        <div className="dash-sidebar-footer">
          <Link className="dash-nav-link" href={ROUTES.home} onClick={() => setOpen(false)}><Icon name="home" size={18} /><span>Back to website</span></Link>
          <button className="dash-nav-link" type="button" disabled={signingOut} onClick={handleSignOut}>
            <Icon name="logout" size={18} /><span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
          {error ? <p className="header-account-error" role="alert">{error}</p> : null}
        </div>
      </aside>
      {open ? <button className="dash-backdrop" type="button" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}

      <div className="dash-main">
        <header className="dash-topbar">
          <button
            className="dash-menu-button"
            type="button"
            ref={toggleRef}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? "close" : "menu"} size={22} />
          </button>
          <nav className="dash-breadcrumbs" aria-label="Breadcrumb">
            <ol>
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <li key={crumb.href}>
                    {last ? <span aria-current="page">{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
                    {last ? null : <Icon name="chevronRight" size={12} />}
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="dash-user">
            <Avatar user={principal} size={34} />
            <span className="dash-user-copy">
              <strong>{principal.name || principal.email}</strong>
              <small>{ROLE_LABELS[principal.role] ?? "Account"}</small>
            </span>
          </div>
        </header>
        <main id="dashboard-main" className="dash-content">{children}</main>
      </div>
    </div>
  );
}
