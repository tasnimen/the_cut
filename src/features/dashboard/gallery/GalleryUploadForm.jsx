"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GALLERY_CATEGORIES } from "@/lib/gallery/gallery-input";
import { UPLOAD_ACCEPT_ATTRIBUTE, UPLOAD_TOAST_KEYS, prepareImageForUpload, uploadFailureKind } from "@/lib/images/client-upload";
import { notify } from "@/lib/toast/notify";

const FILE_MESSAGES = { too_large: "The photo is too large. Choose one under 4 MB.", wrong_type: "Choose a JPG, PNG, WebP or AVIF photo." };

export function GalleryUploadForm() {
  const router = useRouter();
  const formRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const chosen = form.get("file");
    if (!chosen || typeof chosen === "string" || chosen.size === 0) { setErrors({ file: "Choose a photo." }); return; }
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      try {
        form.set("file", await prepareImageForUpload(chosen)); // shrunk and compressed in the browser before sending
      } catch (failure) {
        const kind = failure.code === "too_large" ? "too_large" : "wrong_type";
        setErrors({ file: FILE_MESSAGES[kind] });
        notify(UPLOAD_TOAST_KEYS[kind]);
        return;
      }
      const response = await fetch("/api/admin/gallery", { method: "POST", body: form, credentials: "same-origin" });
      if (response.ok) {
        notify("galleryAdded");
        formRef.current?.reset();
        router.refresh();
        return;
      }
      const data = await response.json().catch(() => ({}));
      const kind = uploadFailureKind(response.status, { hasFieldErrors: Boolean(data.fieldErrors) });
      setErrors(data.fieldErrors ?? {});
      setMessage(data.fieldErrors ? "" : data.message || "The photo could not be saved.");
      notify(data.fieldErrors ? "adminFailed" : UPLOAD_TOAST_KEYS[kind]);
    } catch {
      notify(UPLOAD_TOAST_KEYS.network);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} className="dash-form" onSubmit={submit} noValidate>
      <div className="dash-field">
        <label htmlFor="g-file">Photo</label>
        <input id="g-file" name="file" type="file" accept={UPLOAD_ACCEPT_ATTRIBUTE} disabled={busy} aria-invalid={errors.file ? "true" : undefined} />
        <small>JPG, PNG, WebP or AVIF, up to 4 MB. Only upload photos you have the right to show, and with the permission of anyone who is recognisable in them.</small>
        {errors.file ? <small className="dash-field-error" role="alert">{errors.file}</small> : null}
      </div>
      <div className="dash-form-row">
        <div className="dash-field">
          <label htmlFor="g-title">Title</label>
          <input id="g-title" name="title" maxLength={80} disabled={busy} aria-invalid={errors.title ? "true" : undefined} />
          {errors.title ? <small className="dash-field-error" role="alert">{errors.title}</small> : null}
        </div>
        <div className="dash-field">
          <label htmlFor="g-category">Category</label>
          <select id="g-category" name="category" defaultValue="Haircuts" disabled={busy}>
            {GALLERY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          {errors.category ? <small className="dash-field-error" role="alert">{errors.category}</small> : null}
        </div>
      </div>
      <div className="dash-field">
        <label htmlFor="g-alt">Description for screen readers</label>
        <input id="g-alt" name="alt" maxLength={200} disabled={busy} aria-invalid={errors.alt ? "true" : undefined} />
        <small>A few words describing what is in the photo. If left blank, the title is used.</small>
        {errors.alt ? <small className="dash-field-error" role="alert">{errors.alt}</small> : null}
      </div>
      {message ? <p className="auth-error" role="alert">{message}</p> : null}
      <div className="dash-form-actions">
        <button className="button button-small" type="submit" disabled={busy}><span>{busy ? "Uploading…" : "Add to gallery"}</span></button>
      </div>
    </form>
  );
}
