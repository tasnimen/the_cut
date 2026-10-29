"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { IMAGE_PRESETS } from "@/config/images";
import { UPLOAD_ACCEPT_ATTRIBUTE, UPLOAD_TOAST_KEYS, prepareImageForUpload, uploadFailureKind } from "@/lib/images/client-upload";
import { notify } from "@/lib/toast/notify";

const MESSAGES = { too_large: "That photo is too large. Choose one under 4 MB.", wrong_type: "Choose a JPG, PNG, WebP or AVIF photo.", rate_limited: "Too many photo changes. Try again later.", denied: "Please sign in again to continue.", provider_error: "Your photo could not be saved. Try again." };

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
      const kind = uploadFailureKind(response.status);
      setError(MESSAGES[kind]);
      notify(UPLOAD_TOAST_KEYS[kind]);
    } catch {
      notify(UPLOAD_TOAST_KEYS.network);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function choose(event) {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    setBusy(true);
    setError("");
    let file;
    try {
      file = await prepareImageForUpload(chosen); // shrinks and compresses in the browser first
    } catch (failure) {
      const kind = failure.code === "too_large" ? "too_large" : "wrong_type";
      setError(MESSAGES[kind]);
      notify(UPLOAD_TOAST_KEYS[kind]);
      setBusy(false);
      if (input.current) input.current.value = "";
      return;
    }
    const body = new FormData();
    body.set("file", file);
    await send({ method: "POST", body });
  }

  return (
    <div className="dash-avatar">
      {image ? <ImageWithFallback className="dash-avatar-image" src={image} alt={`${name} profile photo`} width={IMAGE_PRESETS.avatar.width} height={IMAGE_PRESETS.avatar.height} sizes={IMAGE_PRESETS.avatar.sizes} referrerPolicy="no-referrer" /> : <span className="dash-avatar-image dash-avatar-empty" aria-hidden="true">{(name || "?").trim().charAt(0).toUpperCase()}</span>}
      <div className="dash-avatar-body">
        <p className="dash-muted">JPG, PNG, WebP or AVIF, up to 4 MB. It appears on your account page.</p>
        <div className="dash-form-actions">
          <label className="button button-small button-outline dash-file-button">
            <span>{busy ? "Working…" : image ? "Change photo" : "Upload photo"}</span>
            <input ref={input} className="sr-only" type="file" accept={UPLOAD_ACCEPT_ATTRIBUTE} disabled={busy} onChange={choose} aria-label="Choose a profile photo" />
          </label>
          {image ? <button className="dash-link-button" type="button" disabled={busy} onClick={() => send({ method: "DELETE" })}>Remove photo</button> : null}
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
