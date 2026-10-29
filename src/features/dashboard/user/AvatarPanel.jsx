"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast/notify";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MAX_BYTES = 4 * 1024 * 1024;

export function AvatarPanel({ name, image }) {
  const router = useRouter();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(init) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/avatar", { credentials: "same-origin", ...init });
      if (response.ok) { notify("avatarSaved"); router.refresh(); return; }
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Your photo could not be saved. Try again.");
      notify(response.status === 429 ? "rateLimited" : response.status === 401 || response.status === 403 ? "signInRequired" : "uploadFailure");
    } catch {
      notify("network");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function choose(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) { setError("Image must be 4 MB or smaller."); return; }
    const body = new FormData();
    body.set("file", file);
    send({ method: "POST", body });
  }

  return (
    <div className="dash-avatar">
      {image ? <Image className="dash-avatar-image" src={image} alt={`${name} profile photo`} width={96} height={96} referrerPolicy="no-referrer" /> : <span className="dash-avatar-image dash-avatar-empty" aria-hidden="true">{(name || "?").trim().charAt(0).toUpperCase()}</span>}
      <div className="dash-avatar-body">
        <p className="dash-muted">JPG, PNG, WebP or AVIF, up to 4 MB. It appears on your account page.</p>
        <div className="dash-form-actions">
          <label className="button button-small button-outline dash-file-button">
            <span>{busy ? "Working…" : image ? "Change photo" : "Upload photo"}</span>
            <input ref={input} className="sr-only" type="file" accept={ACCEPT} disabled={busy} onChange={choose} aria-label="Choose a profile photo" />
          </label>
          {image ? <button className="dash-link-button" type="button" disabled={busy} onClick={() => send({ method: "DELETE" })}>Remove photo</button> : null}
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
