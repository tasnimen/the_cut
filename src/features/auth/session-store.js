"use client";

import { useSyncExternalStore } from "react";
import { ROUTES } from "@/config/routes";

// Client view of the Better Auth session. The server cookie stays authoritative;
// this store only mirrors `GET /api/auth/get-session` and sign-in/out results.
let state = { status: "loading", user: null, signingOut: false, error: "" };
let inflight = null;
const listeners = new Set();

function setState(next) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot = Object.freeze({ status: "loading", user: null, signingOut: false, error: "" });

export function useAuthSession() {
  return useSyncExternalStore(subscribe, () => state, () => serverSnapshot);
}

export function getSessionState() {
  return state;
}

export function refreshSession() {
  if (inflight) return inflight;
  inflight = fetch(`${ROUTES.auth}/get-session`, { credentials: "same-origin", cache: "no-store" })
    .then(async (response) => {
      const session = response.ok ? await response.json().catch(() => null) : null;
      setState({ status: session?.user ? "authenticated" : "anonymous", user: session?.user ?? null });
    })
    .catch(() => setState({ status: "anonymous", user: null }))
    .finally(() => { inflight = null; });
  return inflight;
}

// Server-rendered header state is authoritative on load; no extra get-session round trip.
export function seedSession(user) {
  if (state.signingOut) return;
  const status = user ? "authenticated" : "anonymous";
  if (state.status === status && (state.user?.email ?? null) === (user?.email ?? null)) return;
  setState({ status, user: user ?? null });
}

export function ensureSession() {
  if (state.status === "loading") refreshSession();
}

export function markSignedIn(user) {
  setState({ status: "authenticated", user: user ?? null, error: "" });
}

// Returns true only when the server confirmed the sign-out.
export async function signOut() {
  if (state.signingOut) return false;
  setState({ signingOut: true, error: "" });
  try {
    const response = await fetch(`${ROUTES.auth}/sign-out`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error("sign-out failed");
    setState({ status: "anonymous", user: null, signingOut: false });
    return true;
  } catch {
    setState({ signingOut: false, error: "Sign out failed. Try again." });
    return false;
  }
}
