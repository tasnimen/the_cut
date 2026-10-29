"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAccountMenuItems, isProtectedPath, ROLE_LABELS } from "@/config/navigation";
import { ROUTES } from "@/config/routes";
import { ensureSession, seedSession, signOut, useAuthSession } from "@/features/auth/session-store";
import { notify } from "@/lib/toast/notify";

// `initialUser` comes from the server render (null = signed out). It is used until the
// client store has resolved, so the header never flashes the wrong state.
export function useSessionNav(initialUser) {
  const session = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (initialUser === undefined) ensureSession();
    else seedSession(initialUser);
  }, [initialUser]);

  const resolved = session.status === "loading" && initialUser !== undefined
    ? { ...session, status: initialUser ? "authenticated" : "anonymous", user: initialUser }
    : session;

  async function handleSignOut() {
    const ok = await signOut();
    notify(ok ? "signOutSuccess" : "signOutFailure");
    if (ok) {
      if (isProtectedPath(pathname || "/")) router.replace(ROUTES.home);
      else router.refresh();
    }
    return ok;
  }
  return { ...resolved, handleSignOut };
}

function initialsFor(user) {
  const source = (user?.name || user?.email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

function isAllowedAvatar(src) {
  try { return new URL(src).hostname === "i.ibb.co"; } catch { return false; }
}

export function Avatar({ user, size = 36 }) {
  return (
    <span className="avatar" style={{ width: size, height: size }} aria-hidden="true">
      {user?.image && isAllowedAvatar(user.image)
        ? <Image src={user.image} alt="" width={size} height={size} />
        : <span className="avatar-initials">{initialsFor(user)}</span>}
    </span>
  );
}

export function AccountIdentity({ user }) {
  return (
    <div className="account-identity">
      <span className="account-name">{user.name || "Your account"}</span>
      <span className="account-email">{user.email}</span>
      <span className="role-badge">{ROLE_LABELS[user.role] || "Customer"}</span>
    </div>
  );
}

function AccountDropdown({ user, signingOut, error, handleSignOut }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const items = getAccountMenuItems(user.role);

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    function onPointer(event) { if (!rootRef.current?.contains(event.target)) setOpen(false); }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function close(returnFocus) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function onMenuKeyDown(event) {
    const nodes = [...menuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    const index = nodes.indexOf(document.activeElement);
    const move = (next) => { event.preventDefault(); nodes[(next + nodes.length) % nodes.length]?.focus(); };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(nodes.length - 1);
    else if (event.key === "Escape") { event.preventDefault(); close(true); }
    else if (event.key === "Tab") close(false);
  }

  function onButtonKeyDown(event) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); }
  }

  return (
    <div className="account-dropdown" ref={rootRef}>
      <button
        type="button"
        className="account-trigger"
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${user.name || user.email}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
      >
        <Avatar user={user} />
      </button>
      {open ? (
        <div className="account-menu" id={menuId} role="menu" aria-label="Account" ref={menuRef} onKeyDown={onMenuKeyDown}>
          <AccountIdentity user={user} />
          <div className="account-menu-links">
            {items.map((item) => (
              <Link key={item.href} href={item.href} role="menuitem" tabIndex={-1} onClick={() => close(false)}>{item.label}</Link>
            ))}
            <button type="button" role="menuitem" tabIndex={-1} disabled={signingOut} onClick={async () => { if (await handleSignOut()) close(false); }}>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
          {error ? <p className="header-account-error" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function HeaderAccount({ initialUser }) {
  const { status, user, signingOut, error, handleSignOut } = useSessionNav(initialUser);

  if (status === "authenticated" && user) {
    return <AccountDropdown user={user} signingOut={signingOut} error={error} handleSignOut={handleSignOut} />;
  }
  if (status === "loading") {
    // Only reachable when the server could not supply the initial state.
    return <span className="header-account-link" aria-hidden="true" style={{ visibility: "hidden" }}>Sign in Sign up</span>;
  }
  return (
    <>
      <Link className="header-account-link" href={ROUTES.signIn}>Sign in</Link>
      <Link className="header-account-link header-account-link--signup" href={ROUTES.signUp}>Sign up</Link>
    </>
  );
}
