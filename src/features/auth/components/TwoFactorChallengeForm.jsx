"use client";

import { useState } from "react";
import { ROUTES } from "@/config/routes";
import { isValidBackupCode, isValidTotpCode, normalizeBackupCode, normalizeTotpCode, twoFactorFailureKey } from "@/lib/auth/two-factor";
import { notify } from "@/lib/toast/notify";

// Second sign-in step for accounts with TOTP enabled. The password step has already been accepted
// (the server holds a short-lived two-factor cookie); no session exists until this succeeds.
export function TwoFactorChallengeForm({ onVerified }) {
  const [useBackup, setUseBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const raw = new FormData(event.currentTarget).get("code");
    const valid = useBackup ? isValidBackupCode(raw) : isValidTotpCode(raw);
    if (!valid) {
      setError(useBackup ? "Enter one of your backup codes." : "Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${ROUTES.auth}/two-factor/${useBackup ? "verify-backup-code" : "verify-totp"}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: useBackup ? normalizeBackupCode(raw) : normalizeTotpCode(raw) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const key = twoFactorFailureKey(response.status);
        notify(key);
        setError(key === "twoFactorInvalid" ? "That code was not accepted. Check it and try again." : "Please wait a moment and try again.");
        return;
      }
      onVerified(result.user ?? null);
    } catch {
      notify("network");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <p className="eyebrow">Two-step verification</p>
      <h1 id="auth-title">Enter your code.</h1>
      <p className="auth-description">
        {useBackup ? "Enter one of your saved backup codes. Each code works once." : "Open your authenticator app and enter the 6-digit code for The Cut."}
      </p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="two-factor-code">{useBackup ? "Backup code" : "Authentication code"}</label>
          <input
            id="two-factor-code"
            name="code"
            required
            autoComplete="one-time-code"
            inputMode={useBackup ? "text" : "numeric"}
            maxLength={useBackup ? 64 : 10}
            autoFocus
          />
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="button auth-submit" type="submit" disabled={busy}>
          <span>{busy ? "Please wait…" : "Verify"}</span>
        </button>
      </form>
      <p className="auth-switch">
        <button className="auth-link-button" type="button" onClick={() => { setUseBackup((value) => !value); setError(""); }}>
          {useBackup ? "Use my authenticator app instead" : "Use a backup code instead"}
        </button>
      </p>
    </section>
  );
}
