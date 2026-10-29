"use client";

import { useActionState, useEffect, useState } from "react";
import { saveContactAction, saveHolidaysAction, saveHoursAction, saveSocialAction } from "@/app/admin/settings/actions";
import { DAYS } from "@/lib/catalog/settings";
import { WEEKDAY_LABELS } from "@/lib/catalog/barber-input";
import { notify } from "@/lib/toast/notify";

function useSettingsForm(action) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  useEffect(() => {
    if (state.status === "success") notify("adminSaved");
    else if (state.status === "error") notify(state.code === "denied" ? "adminDenied" : state.code === "rate" ? "rateLimited" : "adminFailed");
  }, [state]);
  return { state, formAction, pending, errors: state.fieldErrors ?? {} };
}

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

function Footer({ state, pending, label }) {
  return (
    <>
      {state.status === "error" && state.message ? <p className="auth-error" role="alert">{state.message}</p> : null}
      {state.status === "success" ? <p className="auth-message" role="status">{state.message}</p> : null}
      <div className="dash-form-actions">
        <button className="button button-small" type="submit" disabled={pending}><span>{pending ? "Saving…" : label}</span></button>
      </div>
    </>
  );
}

function HoursRow({ day, initial, error }) {
  const [works, setWorks] = useState(initial.works);
  return (
    <div className={`dash-day dash-day--hours${error ? " has-error" : ""}`}>
      <label className="dash-check dash-day-name">
        <input type="checkbox" name={`day_${day}_works`} checked={works} onChange={(event) => setWorks(event.target.checked)} /> {WEEKDAY_LABELS[day]}
      </label>
      <div className="dash-day-times">
        <label className="sr-only" htmlFor={`hours-${day}-open`}>{WEEKDAY_LABELS[day]} opens</label>
        <input id={`hours-${day}-open`} name={`day_${day}_open`} type="time" step={900} defaultValue={initial.open} disabled={!works} />
        <span aria-hidden="true">to</span>
        <label className="sr-only" htmlFor={`hours-${day}-close`}>{WEEKDAY_LABELS[day]} closes</label>
        <input id={`hours-${day}-close`} name={`day_${day}_close`} type="time" step={900} defaultValue={initial.close} disabled={!works} />
        {!works ? <span className="dash-muted">Closed</span> : null}
      </div>
      {error ? <small className="dash-field-error" role="alert">{error}</small> : null}
    </div>
  );
}

export function HoursForm({ initial }) {
  const { state, formAction, pending, errors } = useSettingsForm(saveHoursAction);
  const values = state.values ?? initial;
  return (
    <form action={formAction} className="dash-form" noValidate>
      <p className="dash-form-note">Shop opening hours in Eastern time. Booking slots only exist inside these hours (and each barber&apos;s own hours). Untick a day to close it.</p>
      <div key={state.values ? JSON.stringify(state.values) : "initial"}>
        {DAYS.map((day) => <HoursRow key={day} day={day} initial={values[day]} error={errors[`day_${day}`]} />)}
      </div>
      {errors.hours ? <small className="dash-field-error" role="alert">{errors.hours}</small> : null}
      <Footer state={state} pending={pending} label="Save opening hours" />
    </form>
  );
}

const FLAG_LABELS = { newYearsDay: "New Year's Day", memorialDay: "Memorial Day", independenceDay: "Independence Day", laborDay: "Labor Day", thanksgiving: "Thanksgiving", christmasDay: "Christmas Day", december24EarlyClose: "Close early on December 24" };

export function HolidaysForm({ initial }) {
  const { state, formAction, pending, errors } = useSettingsForm(saveHolidaysAction);
  const values = state.values ?? initial;
  return (
    <form action={formAction} className="dash-form" noValidate>
      <p className="dash-form-note">Closed days are removed from booking and listed on the contact page.</p>
      <fieldset className="dash-fieldset">
        <legend>Closed on</legend>
        <div className="dash-check-grid">
          {Object.entries(FLAG_LABELS).map(([key, label]) => (
            <label className="dash-check" key={key}><input type="checkbox" name={key} defaultChecked={values.flags[key]} /> {label}</label>
          ))}
        </div>
      </fieldset>
      <Field id="holiday-early" label="Early close time on December 24" hint="Used only when the early close is ticked." error={errors.december24EarlyCloseAt}>
        <input id="holiday-early" name="december24EarlyCloseAt" type="time" step={900} defaultValue={values.earlyCloseAt} />
      </Field>
      <Field id="holiday-dates" label="Other closed dates" hint="One date per line, written YYYY-MM-DD (for example 2027-07-05)." error={errors.additionalClosedDates}>
        <textarea id="holiday-dates" name="additionalClosedDates" defaultValue={values.datesText} rows={5} aria-invalid={Boolean(errors.additionalClosedDates)} />
      </Field>
      <Footer state={state} pending={pending} label="Save closed dates" />
    </form>
  );
}

export function ContactForm({ initial }) {
  const { state, formAction, pending, errors } = useSettingsForm(saveContactAction);
  const values = state.values ?? initial;
  return (
    <form action={formAction} className="dash-form" noValidate>
      <p className="dash-form-note">Shown on the contact page and in the footer. Leave a field empty to hide it. The address also creates the Google Maps link.</p>
      <div className="dash-form-row">
        <Field id="contact-phone" label="Phone" hint="For example +1 212 555 0100." error={errors.phone}>
          <input id="contact-phone" name="phone" defaultValue={values.phone ?? ""} inputMode="tel" maxLength={40} />
        </Field>
        <Field id="contact-email" label="Email" error={errors.email}>
          <input id="contact-email" name="email" defaultValue={values.email ?? ""} inputMode="email" maxLength={300} />
        </Field>
      </div>
      <div className="dash-form-row">
        <Field id="contact-street" label="Street address" error={errors.streetAddress}>
          <input id="contact-street" name="streetAddress" defaultValue={values.streetAddress ?? ""} maxLength={200} />
        </Field>
        <Field id="contact-postal" label="Postal code" error={errors.postalCode}>
          <input id="contact-postal" name="postalCode" defaultValue={values.postalCode ?? ""} maxLength={20} />
        </Field>
      </div>
      <Footer state={state} pending={pending} label="Save contact details" />
    </form>
  );
}

const SOCIAL_LABELS = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", x: "X", youtube: "YouTube" };

export function SocialForm({ initial }) {
  const { state, formAction, pending, errors } = useSettingsForm(saveSocialAction);
  const values = state.values ?? initial;
  return (
    <form action={formAction} className="dash-form" noValidate>
      <p className="dash-form-note">Full https:// links to your pages. Only links on each network&apos;s own site are accepted. Leave empty to hide.</p>
      <div className="dash-form-row">
        {Object.entries(SOCIAL_LABELS).map(([platform, label]) => (
          <Field key={platform} id={`social-${platform}`} label={label} error={errors[platform]}>
            <input id={`social-${platform}`} name={platform} defaultValue={values[platform] ?? ""} inputMode="url" maxLength={300} aria-invalid={Boolean(errors[platform])} />
          </Field>
        ))}
      </div>
      <Footer state={state} pending={pending} label="Save social links" />
    </form>
  );
}
