"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWalkInAction, walkInAvailabilityAction } from "@/app/admin/bookings/walk-in/actions";
import { formatMoney } from "@/lib/format/money";
import { notify } from "@/lib/toast/notify";

const MAX_SERVICES = 3;

// Walk-in booking form. Prices shown here are for display only: the server recomputes everything.
export function WalkInForm({ services, today }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [chosen, setChosen] = useState([]);
  const [date, setDate] = useState(today);
  const [barber, setBarber] = useState("any");
  const [options, setOptions] = useState(null);
  const [slot, setSlot] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [reload, setReload] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  // Set the moment Save is pressed, before React re-renders, so a double click cannot send two requests.
  const submitting = useRef(false);

  const selected = useMemo(() => services.filter((service) => chosen.includes(service.slug)), [services, chosen]);
  const minutes = selected.reduce((sum, service) => sum + service.durationMinutes, 0);
  const total = selected.reduce((sum, service) => sum + service.priceMinorUnits, 0);
  const key = `${chosen.join(",")}|${date}|${barber}`;
  // Options belong to the selection they were loaded for; anything older is treated as "loading".
  const loaded = chosen.length > 0 && options?.key === key ? options : null;
  const slotValid = Boolean(loaded?.slots.some((item) => item.startsAt === slot));

  useEffect(() => {
    let cancelled = false;
    if (chosen.length === 0) return undefined;
    walkInAvailabilityAction({ date, serviceSlugs: chosen, barber }).then((result) => {
      if (cancelled) return;
      setSlot("");
      setLoadFailed(false);
      if (result.status === "success") { setOptions({ ...result, key }); setMessage(""); }
      else { setOptions({ slots: [], barbers: [], key }); setMessage(result.message); }
    }).catch(() => {
      // The server was slow, restarting, or this page is older than the server code: say so and offer a retry.
      if (cancelled) return;
      setSlot("");
      setOptions({ slots: [], barbers: [], key });
      setLoadFailed(true);
      setMessage("The free times could not be loaded. The server may be slow or restarting.");
    });
    return () => { cancelled = true; };
    // `chosen` is represented by `key` so the effect runs when the selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reload]);

  function toggle(slug) {
    setChosen((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : current.length >= MAX_SERVICES ? current : [...current, slug]));
    setBarber("any");
  }

  function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setErrors({});
    start(async () => {
      try {
        const result = await createWalkInAction({ customerName: name, phone, email, serviceSlugs: chosen, startsAt: slot, barber });
        if (result.status === "success") {
          notify("walkInBooked");
          router.push("/admin/bookings");
          router.refresh();
          return;
        }
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        notify(result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : result.code === "unexpected" ? "adminUnreachable" : "adminFailed");
      } catch {
        // No answer from the server (slow, restarting, or an older page): the walk-in may or may not have been saved.
        setMessage("The server did not answer. The walk-in may or may not have been saved: check Today's bookings first, then press Book walk-in again.");
        notify("adminUnreachable");
      } finally {
        submitting.current = false;
      }
    });
  }

  return (
    <form className="dash-form" onSubmit={submit} noValidate>
      <div className="dash-form-row">
        <div className="dash-field">
          <label htmlFor="wi-name">Customer name</label>
          <input id="wi-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="off" required aria-invalid={errors.customerName ? "true" : undefined} />
          {errors.customerName ? <small className="dash-field-error" role="alert">{errors.customerName}</small> : null}
        </div>
        <div className="dash-field">
          <label htmlFor="wi-phone">Phone (optional)</label>
          <input id="wi-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} autoComplete="off" aria-invalid={errors.phone ? "true" : undefined} />
          {errors.phone ? <small className="dash-field-error" role="alert">{errors.phone}</small> : <small>No text messages are sent to walk-ins.</small>}
        </div>
        <div className="dash-field">
          <label htmlFor="wi-email">Email (optional)</label>
          <input id="wi-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="off" aria-invalid={errors.email ? "true" : undefined} />
          {errors.email ? <small className="dash-field-error" role="alert">{errors.email}</small> : <small>If you enter one, a confirmation with a calendar file is sent.</small>}
        </div>
      </div>

      <fieldset className="dash-fieldset">
        <legend>Services (up to {MAX_SERVICES})</legend>
        <div className="dash-check-grid">
          {services.map((service) => (
            <label className="dash-check" key={service.slug}>
              <input type="checkbox" checked={chosen.includes(service.slug)} disabled={!chosen.includes(service.slug) && chosen.length >= MAX_SERVICES} onChange={() => toggle(service.slug)} />
              {" "}{service.name} <span className="dash-muted">({service.durationMinutes} min, {formatMoney(service.priceMinorUnits)})</span>
            </label>
          ))}
        </div>
        {errors.serviceSlugs ? <small className="dash-field-error" role="alert">{errors.serviceSlugs}</small> : null}
        {selected.length > 0 ? <p className="dash-form-note">{minutes} minutes, {formatMoney(total)} paid at the shop.</p> : null}
      </fieldset>

      <div className="dash-form-row">
        <div className="dash-field">
          <label htmlFor="wi-date">Date</label>
          <input id="wi-date" type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} required />
        </div>
        <div className="dash-field">
          <label htmlFor="wi-barber">Barber</label>
          <select id="wi-barber" value={barber} onChange={(event) => setBarber(event.target.value)}>
            <option value="any">Any barber</option>
            {(loaded?.barbers ?? []).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <p className="dash-form-note">{chosen.length === 0 ? "Choose a service to see free times." : loaded ? (loaded.slots.length ? "Choose a time (Eastern). Times that already started are not shown." : "No free times on this date.") : "Loading times…"}</p>
        <div className="booking-time-grid" role="radiogroup" aria-label="Free times">
          {(loaded?.slots ?? []).map((item) => (
            <button type="button" role="radio" aria-checked={slot === item.startsAt} className={`booking-time-chip${slot === item.startsAt ? " is-selected" : ""}`} key={`${item.startsAt}-${item.barberName}`} onClick={() => setSlot(item.startsAt)}>
              <span>{item.label}</span><small>{item.barberName}</small>
            </button>
          ))}
        </div>
      </div>

      {message ? <p className="auth-error" role="alert">{message}</p> : null}
      {loadFailed ? <div className="dash-form-actions"><button className="button button-small button-outline" type="button" onClick={() => setReload((count) => count + 1)}><span>Try again</span></button></div> : null}
      <div className="dash-form-actions">
        <button className="button button-small" type="submit" disabled={pending || !slotValid}><span>{pending ? "Booking…" : "Book walk-in"}</span></button>
      </div>
    </form>
  );
}
