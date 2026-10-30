"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { SERVICE_CATEGORIES, SERVICE_ICONS } from "@/lib/catalog/normalize";
import { CatalogImageField } from "@/features/dashboard/components/CatalogImageField";
import { notify } from "@/lib/toast/notify";

const CATEGORY_LABELS = { haircut: "Haircut", beard: "Beard", shave: "Shave", color: "Color", treatment: "Treatment" };
const ICON_LABELS = { scissors: "Scissors", beard: "Beard", razor: "Razor", sparkle: "Sparkle" };

function Field({ id, label, hint, error, children }) {
  return (
    <div className="dash-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
      {error ? <small className="dash-field-error" id={`${id}-error`} role="alert">{error}</small> : null}
    </div>
  );
}

// mode: "create" | "edit". `action` is a Server Action (bound to the slug when editing).
export function ServiceForm({ mode, action, initial }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const values = state.values ?? initial;
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") notify("adminSaved");
    else if (state.status === "error") notify(state.code === "denied" ? "adminDenied" : state.code === "duplicate" ? "adminDuplicate" : state.code === "rate" ? "rateLimited" : "adminFailed");
  }, [state]);

  return (
    <form action={formAction} className="dash-form" noValidate>
      {mode === "create" ? (
        <Field id="service-slug" label="Identifier" hint="Lowercase letters, numbers and hyphens, e.g. hot-towel-shave. It cannot be changed later." error={errors.slug}>
          <input id="service-slug" name="slug" defaultValue={values.slug} maxLength={60} required aria-invalid={Boolean(errors.slug)} />
        </Field>
      ) : (
        <p className="dash-form-note">Identifier: <code>{initial.slug}</code> (cannot be changed)</p>
      )}
      <Field id="service-name" label="Name" error={errors.name}>
        <input id="service-name" name="name" defaultValue={values.name} maxLength={120} required aria-invalid={Boolean(errors.name)} />
      </Field>
      <Field id="service-description" label="Short description" hint="Shown on the service card." error={errors.description}>
        <textarea id="service-description" name="description" defaultValue={values.description} maxLength={500} rows={3} />
      </Field>
      <div className="dash-form-row">
        <Field id="service-price" label="Price (USD, before tax)" hint="For example 25 or 25.50." error={errors.price}>
          <input id="service-price" name="price" defaultValue={values.price} inputMode="decimal" required aria-invalid={Boolean(errors.price)} />
        </Field>
        <Field id="service-duration" label="Duration (minutes)" error={errors.durationMinutes}>
          <input id="service-duration" name="durationMinutes" defaultValue={values.durationMinutes} inputMode="numeric" required aria-invalid={Boolean(errors.durationMinutes)} />
        </Field>
        <Field id="service-order" label="Display order" hint="Lower numbers come first." error={errors.displayOrder}>
          <input id="service-order" name="displayOrder" defaultValue={values.displayOrder} inputMode="numeric" required aria-invalid={Boolean(errors.displayOrder)} />
        </Field>
      </div>
      <div className="dash-form-row">
        <Field id="service-category" label="Category" error={errors.category}>
          <select id="service-category" name="category" defaultValue={values.category}>
            {SERVICE_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
          </select>
        </Field>
        <Field id="service-icon" label="Icon" error={errors.icon}>
          <select id="service-icon" name="icon" defaultValue={values.icon}>
            {SERVICE_ICONS.map((value) => <option key={value} value={value}>{ICON_LABELS[value]}</option>)}
          </select>
        </Field>
      </div>
      <label className="dash-check">
        <input type="checkbox" name="active" defaultChecked={values.active} /> Show this service on the public site and allow booking
      </label>
      <CatalogImageField kind="services" initial={initial.image ?? null} errors={errors} />
      {state.status === "error" && state.message ? <p className="auth-error" role="alert">{state.message}</p> : null}
      {state.status === "success" ? <p className="auth-message" role="status">{state.message}</p> : null}
      <div className="dash-form-actions">
        <button className="button" type="submit" disabled={pending}><span>{pending ? "Saving…" : mode === "create" ? "Create service" : "Save changes"}</span></button>
        <Link className="button button-outline" href="/admin/services"><span>Back to services</span></Link>
      </div>
    </form>
  );
}
