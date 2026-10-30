"use client";

import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { IMAGE_PRESETS } from "@/config/images";
import { ALT_MAX, ALT_MIN } from "@/lib/catalog/image-input";
import { UPLOAD_ACCEPT_ATTRIBUTE, UPLOAD_TOAST_KEYS, checkChosenFile, prepareImageForUpload, uploadFailureKind } from "@/lib/images/client-upload";
import { notify } from "@/lib/toast/notify";

const PRESET_BY_KIND = { services: "service-card", barbers: "barber-portrait", packages: "package-card" };
const MESSAGES = { too_large: "That picture is too large. Choose one under 4 MB.", wrong_type: "Choose a JPG, PNG, WebP or AVIF picture.", rate_limited: "Too many uploads. Try again later.", denied: "Please sign in again to continue.", provider_error: "The picture could not be saved. Try again." };

// The picture field of the service, barber and package editors (create and edit).
// 1. Choose or drop a file, 2. line up the crop with the sliders (the box has the card's fixed shape),
// 3. "Use this picture" shrinks, crops and uploads it. The upload only becomes the record's picture when the
// form is saved (the server attaches it after the record itself saved). Remove and Replace discard what you added.
export function CatalogImageField({ kind, initial, errors = {} }) {
  const preset = IMAGE_PRESETS[PRESET_BY_KIND[kind]];
  const input = useRef(null);
  const previewRef = useRef("");
  const [saved, setSaved] = useState(initial ?? null); // the record's current picture
  const [removed, setRemoved] = useState(false);
  const [chosen, setChosen] = useState(null); // { file, preview }
  const [focus, setFocus] = useState({ x: 50, y: 50 });
  const [pending, setPending] = useState(null); // { mediaId, preview } uploaded, not yet saved with the form
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  function setPreview(file) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : "";
    return previewRef.current;
  }

  async function discardPending() {
    if (!pending) return;
    const { mediaId } = pending;
    setPending(null);
    await fetch("/api/admin/catalog-image", { method: "DELETE", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, mediaId }) }).catch(() => {});
  }

  function pick(file) {
    setMessage("");
    const problem = checkChosenFile(file);
    if (problem) { setMessage(MESSAGES[problem]); notify(UPLOAD_TOAST_KEYS[problem]); return; }
    setChosen({ file, preview: setPreview(file) });
    setFocus({ x: 50, y: 50 });
  }

  async function upload() {
    if (!chosen || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const prepared = await prepareImageForUpload(chosen.file, { aspect: preset.aspect, focusX: focus.x / 100, focusY: focus.y / 100 });
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", prepared);
      const response = await fetch("/api/admin/catalog-image", { method: "POST", body, credentials: "same-origin" });
      if (!response.ok) {
        const failure = uploadFailureKind(response.status);
        setMessage(MESSAGES[failure]);
        notify(UPLOAD_TOAST_KEYS[failure]);
        return;
      }
      const data = await response.json();
      await discardPending(); // an earlier pending upload is replaced
      setPending({ mediaId: data.mediaId, preview: chosen.preview });
      setChosen(null);
      setRemoved(false);
      notify("catalogImageReady");
    } catch (failure) {
      const kindOfFailure = failure?.code === "too_large" ? "too_large" : failure?.code === "wrong_type" ? "wrong_type" : null;
      if (kindOfFailure) { setMessage(MESSAGES[kindOfFailure]); notify(UPLOAD_TOAST_KEYS[kindOfFailure]); } else notify(UPLOAD_TOAST_KEYS.network);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setMessage("");
    setChosen(null);
    await discardPending();
    if (saved) setRemoved(true);
  }

  function undoRemove() { setRemoved(false); }

  const showSaved = saved && !removed && !pending && !chosen;
  const hasPicture = Boolean(pending || chosen || showSaved);
  const boxStyle = { aspectRatio: String(preset.aspect) };

  return (
    <fieldset className="dash-fieldset dash-image-field">
      <legend>Picture (optional)</legend>
      <p className="dash-form-note">Shown on the public site. Without one, the site uses its built-in image. JPG, PNG, WebP or AVIF, up to 4 MB. It is cropped to the shape below.</p>
      <input type="hidden" name="imageMediaId" value={pending?.mediaId ?? ""} />
      <input type="hidden" name="removeImage" value={removed ? "on" : ""} />

      <div
        className={`dash-image-box${dragging ? " is-dragging" : ""}`}
        style={boxStyle}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer?.files?.[0]; if (file) pick(file); }}
      >
        {chosen ? <div className="dash-image-preview" role="img" aria-label="Preview of the cropped picture" style={{ backgroundImage: `url(${chosen.preview})`, backgroundPosition: `${focus.x}% ${focus.y}%` }} />
          : pending ? <div className="dash-image-preview" role="img" aria-label="The picture you added" style={{ backgroundImage: `url(${pending.preview})`, backgroundPosition: "center" }} />
          : showSaved ? <ImageWithFallback className="dash-image-saved" src={saved.url} alt={saved.alt || "Current picture"} fill sizes={preset.sizes} />
          : <p className="dash-image-empty">{removed ? "The picture will be removed when you save." : "Drop a picture here or choose one below."}</p>}
        {busy ? <span className="dash-image-progress" role="status" aria-label="Uploading the picture" /> : null}
      </div>

      {chosen ? (
        <div className="dash-form-row">
          <div className="dash-field"><label htmlFor={`${kind}-fx`}>Move the crop sideways</label><input id={`${kind}-fx`} type="range" min="0" max="100" value={focus.x} onChange={(event) => setFocus((current) => ({ ...current, x: Number(event.target.value) }))} /></div>
          <div className="dash-field"><label htmlFor={`${kind}-fy`}>Move the crop up or down</label><input id={`${kind}-fy`} type="range" min="0" max="100" value={focus.y} onChange={(event) => setFocus((current) => ({ ...current, y: Number(event.target.value) }))} /></div>
        </div>
      ) : null}

      <div className="dash-form-actions">
        <label className="button button-small button-outline dash-file-button">
          <span>{hasPicture ? "Replace picture" : "Choose picture"}</span>
          <input ref={input} className="sr-only" type="file" accept={UPLOAD_ACCEPT_ATTRIBUTE} disabled={busy} aria-label="Choose a picture" onChange={(event) => { const file = event.target.files?.[0]; if (file) pick(file); }} />
        </label>
        {chosen ? <button className="button button-small" type="button" disabled={busy} onClick={upload}><span>{busy ? "Uploading…" : "Use this picture"}</span></button> : null}
        {hasPicture ? <button className="dash-link-button" type="button" disabled={busy} onClick={remove}>Remove picture</button> : null}
        {removed && saved ? <button className="dash-link-button" type="button" onClick={undoRemove}>Keep the current picture</button> : null}
      </div>
      {chosen ? <p className="dash-form-note">Choose &ldquo;Use this picture&rdquo; to add it, then save the form.</p> : null}
      {pending ? <p className="dash-form-note" role="status">Picture added. It becomes live when you save.</p> : null}

      {hasPicture && !removed ? (
        <div className="dash-field">
          <label htmlFor={`${kind}-image-alt`}>Description for screen readers (required with a picture)</label>
          <input id={`${kind}-image-alt`} name="imageAlt" value={alt} maxLength={ALT_MAX} onChange={(event) => setAlt(event.target.value)} aria-invalid={errors.imageAlt ? "true" : undefined} />
          <small>A few words, at least {ALT_MIN} characters, about what the picture shows.</small>
          {errors.imageAlt ? <small className="dash-field-error" role="alert">{errors.imageAlt}</small> : null}
        </div>
      ) : null}
      {message ? <p className="auth-error" role="alert">{message}</p> : null}
      {errors.image ? <p className="auth-error" role="alert">{errors.image}</p> : null}
    </fieldset>
  );
}
