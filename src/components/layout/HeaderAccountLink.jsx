"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { ensureSession, signOut, useAuthSession } from "@/features/auth/session-store";

export function useSessionNav() {
  const session = useAuthSession();
  const router = useRouter();
  useEffect(() => { ensureSession(); }, []);

  async function handleSignOut() {
    const ok = await signOut();
    if (ok) router.refresh();
    return ok;
  }
  return { ...session, handleSignOut };
}

export function HeaderAccountLink() {
  const { status, signingOut, error, handleSignOut } = useSessionNav();

  if (status === "loading") {
    // Reserve the link's space so the header does not shift once the session resolves.
    return <span className="header-account-link" aria-hidden="true" style={{ visibility: "hidden" }}>Sign out</span>;
  }
  if (status === "authenticated") {
    return (
      <>
        <button className="header-account-link header-account-button" type="button" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        {error ? <span className="header-account-error" role="alert">{error}</span> : null}
      </>
    );
  }
  return <Link className="header-account-link" href={ROUTES.signIn}>Sign in</Link>;
}
