"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGalleryItemAction, setGalleryActiveAction, updateGalleryItemAction } from "@/app/admin/gallery/actions";
import { GALLERY_CATEGORIES } from "@/lib/gallery/gallery-input";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { IMAGE_PRESETS } from "@/config/images";
import { notify } from "@/lib/toast/notify";

function toastFor(result) {
  if (result.status === "success") return "adminSaved";
  return result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed";
}

// One photo with edit, show/hide and delete. The server re-checks every permission and field.
export function GalleryItemCard({ item }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState("idle");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    start(async () => {
      const result = await updateGalleryItemAction(item.id, { title: String(form.get("title") ?? ""), category: String(form.get("category") ?? ""), alt: String(form.get("alt") ?? "") });
      notify(toastFor(result));
      if (result.status === "success") { setMode("idle"); setErrors({}); router.refresh(); return; }
      setErrors(result.fieldErrors ?? {});
    });
  }

  function toggle() {
    start(async () => {
      notify(toastFor(await setGalleryActiveAction(item.id, !item.active)));
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const result = await deleteGalleryItemAction(item.id);
      if (result.status === "success") { notify("galleryDeleted"); router.refresh(); return; }
      setMessage(result.message);
      setMode("idle");
      notify(toastFor(result));
    });
  }

  return (
    <li className={`dash-gallery-item${item.active ? "" : " is-hidden"}`}>
      <ImageWithFallback className="dash-gallery-thumb" src={item.thumbUrl} alt={item.alt} width={IMAGE_PRESETS.thumb.width} height={IMAGE_PRESETS.thumb.height} sizes={IMAGE_PRESETS.thumb.sizes} referrerPolicy="no-referrer" />
      <div className="dash-gallery-body">
        {mode === "edit" ? (
          <form className="dash-form" onSubmit={save} noValidate>
            <div className="dash-field">
              <label htmlFor={`t-${item.id}`}>Title</label>
              <input id={`t-${item.id}`} name="title" defaultValue={item.title} maxLength={80} aria-invalid={errors.title ? "true" : undefined} />
              {errors.title ? <small className="dash-field-error" role="alert">{errors.title}</small> : null}
            </div>
            <div className="dash-field">
              <label htmlFor={`c-${item.id}`}>Category</label>
              <select id={`c-${item.id}`} name="category" defaultValue={item.category}>
                {GALLERY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div className="dash-field">
              <label htmlFor={`a-${item.id}`}>Description for screen readers</label>
              <input id={`a-${item.id}`} name="alt" defaultValue={item.alt} maxLength={200} aria-invalid={errors.alt ? "true" : undefined} />
              {errors.alt ? <small className="dash-field-error" role="alert">{errors.alt}</small> : null}
            </div>
            <div className="dash-form-actions">
              <button className="button button-small" type="submit" disabled={pending}><span>{pending ? "Saving…" : "Save"}</span></button>
              <button className="button button-small button-outline" type="button" disabled={pending} onClick={() => { setMode("idle"); setErrors({}); }}><span>Cancel</span></button>
            </div>
          </form>
        ) : (
          <>
            <p><strong>{item.title}</strong> <span className={`dash-badge${item.active ? "" : " is-off"}`}>{item.active ? "Shown" : "Hidden"}</span></p>
            <p className="dash-muted">{item.category}</p>
            {message ? <p className="auth-error" role="alert">{message}</p> : null}
            {mode === "delete" ? (
              <div className="dash-confirm" role="group" aria-label={`Confirm delete ${item.title}`}>
                <p>Delete this photo for good? It is removed from the image service too and cannot be recovered.</p>
                <div className="dash-form-actions">
                  <button className="button button-small" type="button" disabled={pending} onClick={remove}><span>{pending ? "Deleting…" : "Yes, delete"}</span></button>
                  <button className="button button-small button-outline" type="button" disabled={pending} onClick={() => setMode("idle")}><span>Keep it</span></button>
                </div>
              </div>
            ) : (
              <span className="dash-row-actions">
                <button className="dash-link-button" type="button" disabled={pending} onClick={() => { setMessage(""); setMode("edit"); }} aria-label={`Edit ${item.title}`}>Edit</button>
                <button className="dash-link-button" type="button" disabled={pending} onClick={toggle} aria-label={`${item.active ? "Hide" : "Show"} ${item.title}`}>{item.active ? "Hide" : "Show"}</button>
                <button className="dash-link-button" type="button" disabled={pending} onClick={() => { setMessage(""); setMode("delete"); }} aria-label={`Delete ${item.title}`}>Delete</button>
              </span>
            )}
          </>
        )}
      </div>
    </li>
  );
}
