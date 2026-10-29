"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { landingPathFor } from "@/config/dashboard-access";
import { ROUTES } from "@/config/routes";
import { signOut } from "@/features/auth/session-store";
import { signInUrlFor } from "@/lib/auth/callback";
import { formatSecret, isValidTotpCode, normalizeTotpCode, parseTotpSecret, twoFactorFailureKey } from "@/lib/auth/two-factor";
import { notify } from "@/lib/toast/notify";

async function post(path, body) {
  const response = await fetch(`${ROUTES.auth}${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

// Enrolment in two steps: (1) confirm the password and receive the setup key and backup codes,
// (2) prove the authenticator works with a first code. Two-factor is only switched on by the server
// after step 2. Secrets and codes live in component state only; nothing is stored in the browser.
export function TwoFactorEnrol({ role }) {
  const router = useRouter();
  const [step, setStep] = useState("password");
  const [setup, setSetup] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start(event) {
    event.preventDefault();
    if (busy) return;
    const password = String(new FormData(event.currentTarget).get("password") || "");
    if (!password) return;
    setBusy(true);
    setError("");
    try {
      const { ok, status, json } = await post("/two-factor/enable", { password });
      if (!ok) {
        const key = twoFactorFailureKey(status);
        notify(key === "twoFactorInvalid" ? "twoFactorPasswordInvalid" : key);
        setError(key === "twoFactorInvalid" ? "That password was not accepted." : "Please wait a moment and try again.");
        return;
      }
      const secret = parseTotpSecret(json.totpURI);
      if (!secret) {
        notify("unexpected");
        return;
      }
      setSetup({ uri: json.totpURI, secret, backupCodes: Array.isArray(json.backupCodes) ? json.backupCodes : [] });
      setStep("verify");
    } catch {
      notify("network");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    if (busy) return;
    const raw = new FormData(event.currentTarget).get("code");
    if (!isValidTotpCode(raw)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { ok, status } = await post("/two-factor/verify-totp", { code: normalizeTotpCode(raw) });
      if (!ok) {
        const key = twoFactorFailureKey(status);
        notify(key);
        setError(key === "twoFactorInvalid" ? "That code was not accepted. Check it and try again." : "Please wait a moment and try again.");
        return;
      }
      notify("twoFactorEnabled");
      // Enabling two-factor invalidates existing sessions, so sign in again (with the new code).
      await signOut();
      router.push(signInUrlFor(landingPathFor(role)));
    } catch {
      notify("network");
    } finally {
      setBusy(false);
    }
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(setup.backupCodes.join("\n"));
      notify("copied");
    } catch {
      notify("unexpected");
    }
  }

  if (step === "password") {
    return (
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">Two-step verification</p>
        <h1 id="auth-title">Secure your account.</h1>
        <p className="auth-description">Admin accounts need an authenticator app (such as Google Authenticator, 1Password or Authy). Confirm your password to begin.</p>
        <form className="auth-form" onSubmit={start}>
          <div className="auth-field">
            <label htmlFor="enrol-password">Password</label>
            <input id="enrol-password" name="password" type="password" autoComplete="current-password" maxLength={128} required />
          </div>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button className="button auth-submit" type="submit" disabled={busy}><span>{busy ? "Please wait…" : "Continue"}</span></button>
        </form>
      </section>
    );
  }

  return (
    <section className="auth-card auth-card--wide" aria-labelledby="auth-title">
      <p className="eyebrow">Two-step verification</p>
      <h1 id="auth-title">Add your authenticator.</h1>
      <ol className="tf-steps">
        <li>
          <strong>1. Add The Cut to your authenticator app.</strong>
          <p>Choose “enter a setup key” and type this key (spaces do not matter), or open the link on the device that has the app.</p>
          <code className="tf-secret" aria-label="Setup key">{formatSecret(setup.secret)}</code>
          <p><a href={setup.uri}>Open in authenticator app</a></p>
        </li>
        <li>
          <strong>2. Save your backup codes.</strong>
          <p>Each code works once if you lose your phone. They are shown only now.</p>
          <ul className="tf-codes" aria-label="Backup codes">
            {setup.backupCodes.map((code) => <li key={code}><code>{code}</code></li>)}
          </ul>
          <button className="auth-link-button" type="button" onClick={copyCodes}>Copy codes</button>
          <label className="tf-check"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} /> I have saved my backup codes somewhere safe</label>
        </li>
        <li>
          <strong>3. Enter the 6-digit code.</strong>
          <form className="auth-form" onSubmit={verify}>
            <div className="auth-field">
              <label htmlFor="enrol-code">Authentication code</label>
              <input id="enrol-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} required />
            </div>
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
            <button className="button auth-submit" type="submit" disabled={busy || !saved}><span>{busy ? "Please wait…" : "Turn on two-step verification"}</span></button>
          </form>
        </li>
      </ol>
    </section>
  );
}
