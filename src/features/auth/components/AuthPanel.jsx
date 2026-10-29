"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { landingPathFor } from "@/config/dashboard-access";
import { ROUTES } from "@/config/routes";
import { notify } from "@/lib/toast/notify";
import { toastKeyForStatus } from "@/lib/toast/messages";
import { TwoFactorChallengeForm } from "@/features/auth/components/TwoFactorChallengeForm";
import { markSignedIn, signOut as signOutSession } from "@/features/auth/session-store";

export function AuthPanel({ mode, callbackPath = ROUTES.home }) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState(false);
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
        notify(response.status === 429 || response.status >= 500 ? toastKeyForStatus(response.status) : (isSignUp ? "signUpFailure" : "signInFailure"));
        setError(isSignUp
          ? "We couldn't complete sign-up. Check the details and try again."
          : "Sign-in failed. Check your email and password and try again.");
        return;
      }

      if (!isSignUp && result.twoFactorRedirect) {
        formElement.reset();
        setChallenge(true);
        return;
      }

      if (isSignUp) {
        formElement.reset();
        // With email verification off, sign-up signs the user in; the session cookie decides.
        const session = await fetch(`${ROUTES.auth}/get-session`, { credentials: "same-origin", cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null)).catch(() => null);
        if (session?.user) {
          setUser(session.user);
          markSignedIn(session.user);
          setMessage("Your account is ready and you are signed in.");
          notify("signUpSuccess");
          if (callbackPath !== ROUTES.home) router.push(callbackPath);
        } else {
          setMessage("If this address can be registered, check your inbox for a verification link, then sign in.");
          notify("signUpCheckInbox");
        }
      } else {
        setUser(result.user || null);
        markSignedIn(result.user || null);
        setMessage("You are signed in.");
        notify("signInSuccess");
        // An explicit callback wins; otherwise go to the role's landing page.
        const target = callbackPath !== ROUTES.home ? callbackPath : landingPathFor(result.user?.role);
        if (target !== ROUTES.home) router.push(target);
      }
    } catch {
      setError("We couldn't reach the sign-in service. Try again.");
      notify("network");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setMessage("");
    setError("");
    const ok = await signOutSession();
    if (ok) {
      setUser(null);
      setMessage("You are signed out.");
      notify("signOutSuccess");
    } else {
      setError("We couldn't end this session. Try again.");
      notify("signOutFailure");
    }
    setBusy(false);
  }

  function handleVerified(verifiedUser) {
    setChallenge(false);
    setUser(verifiedUser);
    markSignedIn(verifiedUser);
    notify("signInSuccess");
    const target = callbackPath !== ROUTES.home ? callbackPath : landingPathFor(verifiedUser?.role);
    if (target !== ROUTES.home) router.push(target);
  }

  if (challenge) return <TwoFactorChallengeForm onVerified={handleVerified} />;

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
        <div className="auth-field">
          <label htmlFor="auth-password">Password</label>
          <span className="auth-password">
            <input
            id="auth-password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            maxLength={128}
            minLength={isSignUp ? 10 : 1}
            name="password"
            required
            type={showPassword ? "text" : "password"}
            />
            <button className="auth-password-toggle" type="button" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
          {isSignUp ? <small className="auth-hint">Use at least 10 characters.</small> : null}
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        <button className="button auth-submit" type="submit" disabled={busy}>
          <span>{busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}</span>
        </button>
      </form>
      {!isSignUp ? <p className="auth-switch"><Link href={ROUTES.forgotPassword}>Forgot your password?</Link></p> : null}
      <p className="auth-switch">
        {isSignUp ? "Already have an account? " : "New to The Cut? "}
        <Link href={isSignUp ? ROUTES.signIn : ROUTES.signUp}>{isSignUp ? "Sign in" : "Create an account"}</Link>
      </p>
    </section>
  );
}
