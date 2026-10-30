"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/lib/catalog/barber-input";
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

function DayRow({ day, initial, error }) {
  const [works, setWorks] = useState(initial.works);
  const [breakOn, setBreakOn] = useState(initial.breakOn);
  return (
    <div className={`dash-day${error ? " has-error" : ""}`}>
      <label className="dash-check dash-day-name">
        <input type="checkbox" name={`day_${day}_works`} checked={works} onChange={(event) => setWorks(event.target.checked)} /> {WEEKDAY_LABELS[day]}
      </label>
      <div className="dash-day-times">
        <label className="sr-only" htmlFor={`${day}-open`}>{WEEKDAY_LABELS[day]} opens</label>
        <input id={`${day}-open`} name={`day_${day}_open`} type="time" step={900} defaultValue={initial.open} disabled={!works} />
        <span aria-hidden="true">to</span>
        <label className="sr-only" htmlFor={`${day}-close`}>{WEEKDAY_LABELS[day]} closes</label>
        <input id={`${day}-close`} name={`day_${day}_close`} type="time" step={900} defaultValue={initial.close} disabled={!works} />
      </div>
      <div className="dash-day-break">
        <label className="dash-check">
          <input type="checkbox" name={`day_${day}_break`} checked={breakOn && works} disabled={!works} onChange={(event) => setBreakOn(event.target.checked)} /> Break
        </label>
        <label className="sr-only" htmlFor={`${day}-bs`}>{WEEKDAY_LABELS[day]} break starts</label>
        <input id={`${day}-bs`} name={`day_${day}_breakStart`} type="time" step={900} defaultValue={initial.breakStart} disabled={!works || !breakOn} />
        <span aria-hidden="true">to</span>
        <label className="sr-only" htmlFor={`${day}-be`}>{WEEKDAY_LABELS[day]} break ends</label>
        <input id={`${day}-be`} name={`day_${day}_breakEnd`} type="time" step={900} defaultValue={initial.breakEnd} disabled={!works || !breakOn} />
      </div>
      {error ? <small className="dash-field-error" role="alert">{error}</small> : null}
    </div>
  );
}

// mode: "create" | "edit". `services` is [{ slug, name }]. `initial` comes from barberToFormValues().
export function BarberForm({ mode, action, initial, services }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const values = state.values ?? initial;
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") notify("adminSaved");
    else if (state.status === "error") notify(state.code === "denied" ? "adminDenied" : state.code === "duplicate" ? "adminDuplicate" : state.code === "rate" ? "rateLimited" : "adminFailed");
  }, [state]);

  // Remount the schedule rows when the server sends values back so their local state matches.
  const scheduleKey = state.values ? JSON.stringify(state.values.days) : "initial";

  return (
    <form action={formAction} className="dash-form" noValidate>
      {mode === "create" ? (
        <Field id="barber-slug" label="Identifier" hint="Lowercase letters, numbers and hyphens, e.g. mike-jones. It cannot be changed later." error={errors.slug}>
          <input id="barber-slug" name="slug" defaultValue={values.slug} maxLength={60} required aria-invalid={Boolean(errors.slug)} />
        </Field>
      ) : (
        <p className="dash-form-note">Identifier: <code>{initial.slug}</code> (cannot be changed)</p>
      )}
      <Field id="barber-name" label="Name" error={errors.name}>
        <input id="barber-name" name="name" defaultValue={values.name} maxLength={120} required aria-invalid={Boolean(errors.name)} />
      </Field>

      <fieldset className="dash-fieldset">
        <legend>Services this barber offers</legend>
        <div className="dash-check-grid">
          {services.map((service) => (
            <label className="dash-check" key={service.slug}>
              <input type="checkbox" name="serviceSlugs" value={service.slug} defaultChecked={values.serviceSlugs.includes(service.slug)} /> {service.name}
            </label>
          ))}
        </div>
        {errors.serviceSlugs ? <small className="dash-field-error" role="alert">{errors.serviceSlugs}</small> : null}
      </fieldset>

      <fieldset className="dash-fieldset" key={scheduleKey}>
        <legend>Weekly hours</legend>
        <p className="dash-form-note">Times are in the shop&apos;s time zone (Eastern). Tick the days this barber works. Clients can only book inside these hours and the shop&apos;s opening hours. Changing hours does not move existing appointments.</p>
        {WEEKDAYS.map((day) => <DayRow key={day} day={day} initial={values.days[day]} error={errors[`day_${day}`]} />)}
        {errors.weeklySchedule ? <small className="dash-field-error" role="alert">{errors.weeklySchedule}</small> : null}
      </fieldset>

      <Field id="barber-daysoff" label="Days off" hint="One date per line, written YYYY-MM-DD (for example 2027-12-24). No bookings are offered on these dates." error={errors.daysOff}>
        <textarea id="barber-daysoff" name="daysOff" defaultValue={values.daysOffText} rows={4} aria-invalid={Boolean(errors.daysOff)} />
      </Field>

      <fieldset className="dash-fieldset">
        <legend>Public profile</legend>
        <p className="dash-form-note">The home page shows this barber by name only when &ldquo;Show on the website&rdquo; is ticked. Photos come from the image slots.</p>
        <label className="dash-check"><input type="checkbox" name="publicProfile" defaultChecked={values.publicProfile} /> Show on the website</label>
        <div className="dash-form-row">
          <Field id="barber-role" label="Role" hint="For example Master Barber." error={errors.role}>
            <input id="barber-role" name="role" defaultValue={values.role} maxLength={60} />
          </Field>
          <Field id="barber-focus" label="Specialty" hint="A few words, e.g. Classic cuts." error={errors.focus}>
            <input id="barber-focus" name="focus" defaultValue={values.focus} maxLength={120} />
          </Field>
          <Field id="barber-order" label="Display order" error={errors.displayOrder}>
            <input id="barber-order" name="displayOrder" defaultValue={values.displayOrder} inputMode="numeric" required aria-invalid={Boolean(errors.displayOrder)} />
          </Field>
        </div>
      </fieldset>

      <label className="dash-check"><input type="checkbox" name="active" defaultChecked={values.active} /> Can be booked (turn off to hide this barber from booking)</label>
      <CatalogImageField kind="barbers" initial={initial.image ?? null} errors={errors} />
      {state.status === "error" && state.message ? <p className="auth-error" role="alert">{state.message}</p> : null}
      {state.status === "success" ? <p className="auth-message" role="status">{state.message}</p> : null}
      <div className="dash-form-actions">
        <button className="button" type="submit" disabled={pending}><span>{pending ? "Saving…" : mode === "create" ? "Create barber" : "Save changes"}</span></button>
        <Link className="button button-outline" href="/admin/barbers"><span>Back to barbers</span></Link>
      </div>
    </form>
  );
}
