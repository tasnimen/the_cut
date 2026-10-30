"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { CatalogImageField } from "@/features/dashboard/components/CatalogImageField";
import { notify } from "@/lib/toast/notify";

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

// mode: "create" | "edit". `services` is [{ slug, name }] for the "preselect on booking" choice.
export function PackageForm({ mode, action, initial, services }) {
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
        <Field id="package-slug" label="Identifier" hint="Lowercase letters, numbers and hyphens, e.g. gold. It cannot be changed later." error={errors.slug}>
          <input id="package-slug" name="slug" defaultValue={values.slug} maxLength={60} required aria-invalid={Boolean(errors.slug)} />
        </Field>
      ) : (
        <p className="dash-form-note">Identifier: <code>{initial.slug}</code> (cannot be changed)</p>
      )}
      <Field id="package-name" label="Name" error={errors.name}>
        <input id="package-name" name="name" defaultValue={values.name} maxLength={80} required aria-invalid={Boolean(errors.name)} />
      </Field>
      <Field id="package-note" label="Short line under the name" hint="For example: Most popular choice." error={errors.note}>
        <input id="package-note" name="note" defaultValue={values.note} maxLength={200} />
      </Field>
      <div className="dash-form-row">
        <Field id="package-price" label="Price (USD, before tax)" hint="For example 40 or 40.00. Shown on the pricing page." error={errors.price}>
          <input id="package-price" name="price" defaultValue={values.price} inputMode="decimal" required aria-invalid={Boolean(errors.price)} />
        </Field>
        <Field id="package-order" label="Display order" hint="Lower numbers come first." error={errors.displayOrder}>
          <input id="package-order" name="displayOrder" defaultValue={values.displayOrder} inputMode="numeric" required aria-invalid={Boolean(errors.displayOrder)} />
        </Field>
      </div>
      <Field id="package-inclusions" label="What is included" hint="One item per line (up to 12)." error={errors.inclusions}>
        <textarea id="package-inclusions" name="inclusions" defaultValue={values.inclusions} rows={6} required aria-invalid={Boolean(errors.inclusions)} />
      </Field>
      <fieldset className="dash-fieldset">
        <legend>Services to preselect when someone clicks Book Now (up to 3)</legend>
        <p className="dash-form-note">The booking page always charges the service prices from the Services list, not the package price.</p>
        <div className="dash-check-grid">
          {services.map((service) => (
            <label className="dash-check" key={service.slug}>
              <input type="checkbox" name="bookingServiceSlugs" value={service.slug} defaultChecked={values.bookingServiceSlugs.includes(service.slug)} /> {service.name}
            </label>
          ))}
        </div>
        {errors.bookingServiceSlugs ? <small className="dash-field-error" role="alert">{errors.bookingServiceSlugs}</small> : null}
      </fieldset>
      <label className="dash-check"><input type="checkbox" name="featured" defaultChecked={values.featured} /> Show the &ldquo;Popular&rdquo; badge (only one package can have it)</label>
      <label className="dash-check"><input type="checkbox" name="active" defaultChecked={values.active} /> Show this package on the pricing page</label>
      <CatalogImageField kind="packages" initial={initial.image ?? null} errors={errors} nameInputId="package-name" mode={mode} />
      {state.status === "error" && state.message ? <p className="auth-error" role="alert">{state.message}</p> : null}
      {state.status === "success" ? <p className="auth-message" role="status">{state.message}</p> : null}
      <div className="dash-form-actions">
        <button className="button" type="submit" disabled={pending}><span>{pending ? "Saving…" : mode === "create" ? "Create package" : "Save changes"}</span></button>
        <Link className="button button-outline" href="/admin/packages"><span>Back to packages</span></Link>
      </div>
    </form>
  );
}
