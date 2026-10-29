"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/config/routes";
import { toastKeyForStatus } from "@/lib/toast/messages";
import { notify } from "@/lib/toast/notify";

export function ResetPasswordForm({ token }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">The Cut Barbershop</p>
        <h1 id="auth-title">Link not valid.</h1>
        <p className="auth-description">This reset link is invalid or has expired. Request a new one to continue.</p>
        <Link className="button auth-submit" href={ROUTES.forgotPassword}><span>Request a new link</span></Link>
      </section>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") || "");
    if (newPassword !== String(form.get("confirm") || "")) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${ROUTES.auth}/reset-password`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword, token }),
      });
      if (response.ok) {
        notify("passwordResetSuccess");
        router.push(ROUTES.signIn);
        return;
      }
      if (response.status === 429 || response.status >= 500) notify(toastKeyForStatus(response.status));
      else {
        notify("passwordResetFailure");
        setError("This reset link is invalid or has expired, or the password is not acceptable. Request a new link or try a longer password.");
      }
    } catch {
      notify("network");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <p className="eyebrow">The Cut Barbershop</p>
      <h1 id="auth-title">Choose a new password.</h1>
      <p className="auth-description">Use at least 10 characters. You will be signed out everywhere else.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>New password</span>
          <input autoComplete="new-password" maxLength={128} minLength={10} name="password" required type="password" />
        </label>
        <label className="auth-field">
          <span>Confirm new password</span>
          <input autoComplete="new-password" maxLength={128} minLength={10} name="confirm" required type="password" />
        </label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="button auth-submit" type="submit" disabled={busy}>
          <span>{busy ? "Please wait…" : "Update password"}</span>
        </button>
      </form>
    </section>
  );
}
