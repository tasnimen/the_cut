"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/config/routes";

export function AuthPanel({ mode }) {
  const isSignUp = mode === "sign-up";
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${ROUTES.auth}/get-session`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const session = await response.json();
      if (session?.user) setUser(session.user);
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = isSignUp
      ? { name: form.get("name"), email: form.get("email"), password: form.get("password"), callbackURL: ROUTES.signIn }
      : { email: form.get("email"), password: form.get("password"), callbackURL: ROUTES.signIn };

    try {
      const response = await fetch(`${ROUTES.auth}/${isSignUp ? "sign-up" : "sign-in"}/email`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(isSignUp
          ? "We couldn't complete sign-up. Check the details and try again."
          : "Sign-in failed. Check your details or verify your email.");
        return;
      }

      if (isSignUp) {
        formElement.reset();
        setMessage("If this address can be registered, check your inbox for a verification link. If you need another link, try signing in with this address.");
      } else {
        setUser(result.user || null);
        setMessage("You are signed in.");
      }
    } catch {
      setError("We couldn't reach the sign-in service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${ROUTES.auth}/sign-out`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok) {
        setError("We couldn't end this session. Try again.");
        return;
      }
      setUser(null);
      setMessage("You are signed out.");
    } catch {
      setError("We couldn't reach the sign-in service. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">Your account</p>
        <h1 id="auth-title">Welcome back.</h1>
        <p className="auth-description">Signed in as <strong>{user.email}</strong>.</p>
        <button className="button button-outline auth-submit" type="button" onClick={handleSignOut} disabled={busy}>
          <span>{busy ? "Signing out…" : "Sign out"}</span>
        </button>
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <p className="eyebrow">The Cut Barbershop</p>
      <h1 id="auth-title">{isSignUp ? "Make yourself at home." : "Good to see you."}</h1>
      <p className="auth-description">
        {isSignUp ? "Create an account to keep your details together." : "Sign in to continue to your account."}
      </p>
      <form className="auth-form" onSubmit={handleSubmit}>
        {isSignUp ? (
          <label className="auth-field">
            <span>Name</span>
            <input autoComplete="name" maxLength={100} name="name" required />
          </label>
        ) : null}
        <label className="auth-field">
          <span>Email</span>
          <input autoComplete="email" maxLength={320} name="email" required type="email" />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            autoComplete={isSignUp ? "new-password" : "current-password"}
            maxLength={128}
            minLength={isSignUp ? 10 : 1}
            name="password"
            required
            type="password"
          />
        </label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        <button className="button auth-submit" type="submit" disabled={busy}>
          <span>{busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}</span>
        </button>
      </form>
      <p className="auth-switch">
        {isSignUp ? "Already have an account? " : "New to The Cut? "}
        <Link href={isSignUp ? ROUTES.signIn : ROUTES.signUp}>{isSignUp ? "Sign in" : "Create an account"}</Link>
      </p>
    </section>
  );
}
