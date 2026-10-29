"use client";

import Link from "next/link";
import { useState } from "react";
import { ROUTES } from "@/config/routes";
import { toastKeyForStatus } from "@/lib/toast/messages";
import { notify } from "@/lib/toast/notify";

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const formElement = event.currentTarget;
    const email = new FormData(formElement).get("email");
    try {
      const response = await fetch(`${ROUTES.auth}/request-password-reset`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, redirectTo: ROUTES.resetPassword }),
      });
      if (response.status === 429 || response.status >= 500) {
        notify(toastKeyForStatus(response.status));
      } else {
        // Same wording for every address: nothing reveals whether an account exists.
        setSent(true);
        formElement.reset();
        notify("passwordResetRequested");
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
      <h1 id="auth-title">Forgot your password?</h1>
      <p className="auth-description">Enter your email and we will send a link to choose a new one.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Email</span>
          <input autoComplete="email" maxLength={320} name="email" required type="email" />
        </label>
        {sent ? <p className="auth-message" role="status">If an account exists for that email, a reset link is on its way. It expires in one hour.</p> : null}
        <button className="button auth-submit" type="submit" disabled={busy}>
          <span>{busy ? "Please wait…" : "Send reset link"}</span>
        </button>
      </form>
      <p className="auth-switch"><Link href={ROUTES.signIn}>Back to sign in</Link></p>
    </section>
  );
}
