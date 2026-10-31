"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AvailabilityCalendar } from "@/features/booking/components/AvailabilityCalendar";
import { BookingProgress } from "@/features/booking/components/BookingProgress";
import { ROUTES } from "@/config/routes";
import { useRouter } from "next/navigation";
import { signInUrlFor } from "@/lib/auth/callback";
import { notify } from "@/lib/toast/notify";
import { bookingFailureMessage, bookingFailureToast } from "@/lib/booking/error-messages";
import { formatMoney } from "@/lib/format/money";


const GROUPS = [{ key: "morning", label: "Morning" }, { key: "afternoon", label: "Afternoon" }, { key: "evening", label: "Evening" }];
const REASON_TEXT = { booked: "Booked", blocked: "Unavailable", break: "Break", unavailable: "Unavailable", past: "Past" };
const DATE_NOTES = { closed: "The shop is closed on this date.", full: "Fully booked on this date. Pick another day or use the next available time.", past: "That day has already passed." };
const REFRESH_MS = 30_000;

// Morning before noon, afternoon until 5 pm, evening after (read from the shop-time label, e.g. "9:00 AM").
function groupOf(label) {
  const match = /^(\d{1,2}):\d{2}\s?(AM|PM)/i.exec(label);
  if (!match) return "morning";
  const hour = (Number(match[1]) % 12) + (match[2].toUpperCase() === "PM" ? 12 : 0);
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}
const addDays = (date, amount) => new Date(Date.parse(`${date}T12:00:00Z`) + amount * 86_400_000).toISOString().slice(0, 10);
const DAY_FORMAT = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export function BookingForm({ today, services = [], initialServiceSlugs = [] }) {
  const router = useRouter();
  const bookableServices = useMemo(() => services.filter((item) => item.bookable !== false), [services]);
  const [selected, setSelected] = useState(() => {
    const wanted = (initialServiceSlugs.length ? initialServiceSlugs : [bookableServices[0]?.slug]).filter(Boolean);
    return wanted.filter((slug) => bookableServices.some((item) => item.slug === slug));
  });
  const [date, setDate] = useState(today);
  const [barber, setBarber] = useState("any");
  const [options, setOptions] = useState(null);
  const [dateStates, setDateStates] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoPick, setAutoPick] = useState(false);
  const lastLoaded = useRef(0);
  const [slot, setSlot] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const queryKey = `${date}|${barber}|${selected.join(",")}`;
  const availability = options?.queryKey === queryKey ? options.data : null;
  const selectedServices = useMemo(() => selected.map((slug) => availability?.services?.find((item) => item.slug === slug) || services.find((item) => item.slug === slug)).filter(Boolean), [selected, availability, services]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  // Times for the chosen date. Re-run when the choices change, after a conflict, and when the tab comes back into view.
  useEffect(() => {
    if (!date || selected.length < 1) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ date, barber });
    selected.forEach((slug) => query.append("service", slug));
    fetch(`/api/bookings/availability?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "availability_unavailable");
        lastLoaded.current = Date.now();
        setLoadError(false);
        setOptions({ queryKey, data: body });
      })
      .catch((error) => { if (error.name !== "AbortError") setLoadError(true); });
    return () => controller.abort();
  }, [date, barber, selected, queryKey, refreshKey]);

  // The state of every date in the window, for the calendar and the "next available" shortcut.
  const datesKey = `${barber}|${selected.join(",")}`;
  useEffect(() => {
    if (selected.length < 1) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ barber });
    selected.forEach((slug) => query.append("service", slug));
    fetch(`/api/bookings/availability/dates?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "availability_unavailable");
        setDateStates({ key: datesKey, map: Object.fromEntries(body.dates.map((entry) => [entry.date, entry])) });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [barber, selected, datesKey, refreshKey]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - lastLoaded.current > REFRESH_MS) refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
  }, [refresh]);

  const states = dateStates?.key === datesKey ? dateStates.map : null;
  const nextOpen = states ? Object.values(states).filter((entry) => entry.state === "open" && entry.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] : null;
  const lastDate = useMemo(() => (states ? Object.keys(states).sort().at(-1) : addDays(today, 30)), [states, today]);

  function jumpToNext() {
    if (!nextOpen) return;
    setDate(nextOpen.date);
    setSlot("");
    setAutoPick(true);
  }

  const priceIsConfigured = selectedServices.every((item) => Number.isInteger(item.priceMinorUnits));
  const total = selectedServices.reduce((sum, item) => sum + (item.priceMinorUnits || 0), 0);
  const activeSlot = slot || (autoPick ? availability?.slots?.[0]?.startsAt ?? "" : "");
  const chosenSlot = availability?.slots?.find((item) => item.startsAt === activeSlot);

  function toggleService(slug) {
    setStatus("");
    setSelected((current) => current.includes(slug)
      ? current.filter((value) => value !== slug)
      : current.length < 3 ? [...current, slug] : current);
  }

  async function submit(event) {
    event.preventDefault();
    if (!chosenSlot || !priceIsConfigured) return;
    setPending(true);
    setStatus("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceSlugs: selected, startsAt: activeSlot, barber, phone, smsConsent }),
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        setStatus("Sign in to confirm your booking.");
        notify("signInRequired");
        router.push(signInUrlFor(ROUTES.booking));
      } else if (response.status === 409 && result.error === "price_not_configured") {
        setStatus("Prices are being finalized. Please check back soon.");
        notify("bookingFailure");
      } else if (!response.ok) {
        notify(bookingFailureToast(result.error, response.status));
        setStatus(bookingFailureMessage(result.error, response.status));
        if (response.status === 409) { setSlot(""); setAutoPick(false); refresh(); }
      } else {
        setStatus("Your appointment is confirmed. A confirmation email is on its way.");
        setSlot("");
        notify("bookingCreated");
      }
    } catch {
      setStatus("We couldn't reach the booking service. Please retry.");
      notify("network");
    } finally { setPending(false); }
  }

  return (
    <form className="booking-form" onSubmit={submit}>
      <BookingProgress />
      <div className="booking-step-grid">
        <fieldset className="booking-step-panel booking-service-panel">
          <legend><span className="booking-step-number">1.</span><span>Choose Service</span></legend>
          <p className="booking-step-note">Select up to three services</p>
          <div className="booking-service-options">
            {services.map((service) => {
              const off = service.bookable === false;
              return (
                <label className={`booking-service-option${selected.includes(service.slug) ? " is-selected" : ""}${off ? " is-disabled" : ""}`} key={service.slug}>
                  <span className="booking-service-icon" aria-hidden="true"><Icon name={service.icon} size={15} /></span>
                  <span className="booking-service-copy"><span>{service.name}</span><small>{off ? "Not available for booking right now" : `${service.durationMinutes} minutes`}</small></span>
                  <span className="booking-service-price">{Number.isInteger(service.priceMinorUnits) ? formatMoney(service.priceMinorUnits) : "TBC"}</span>
                  <input type="checkbox" value={service.slug} checked={selected.includes(service.slug)} disabled={off} onChange={() => toggleService(service.slug)} aria-label={off ? `${service.name}, not available for booking right now` : `Select ${service.name}`} />
                </label>
              );
            })}
          </div>
          {!priceIsConfigured ? <p className="booking-field-note">Online confirmation opens when all service prices are set.</p> : null}
        </fieldset>

        <fieldset className="booking-step-panel booking-barber-panel">
          <legend><span className="booking-step-number">2.</span><span>Select Barber</span></legend>
          <p className="booking-step-note">Available barbers are shown for this service.</p>
          <div className="booking-preference-list" role="radiogroup" aria-label="Barber">
            {[{ id: "any", slug: "any", name: "Any barber", state: availability?.anyBarber?.state ?? "available", stateLabel: availability?.anyBarber?.stateLabel ?? "" }, ...(availability?.barbers ?? [])].map((item) => {
              const off = item.state && item.state !== "available" && item.slug !== barber;
              return (
                <label className={`booking-preference-option${off ? " is-disabled" : ""}`} key={item.id}>
                  <span className="booking-barber-mark" aria-hidden="true">{item.slug === "any" ? "★" : item.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                  <span className="booking-preference-copy">
                    <strong>{item.name}</strong>
                    {item.stateLabel && item.state !== "available" ? <small className="booking-reason">{item.stateLabel}</small> : item.slug === "any" ? <small>Assigns the least-booked eligible barber</small> : null}
                  </span>
                  <input type="radio" name="barber" value={item.slug} checked={barber === item.slug} disabled={off} onChange={() => setBarber(item.slug)} aria-label={item.stateLabel && item.state !== "available" ? `${item.name}, ${item.stateLabel}` : item.name} />
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="booking-step-panel booking-date-panel">
          <legend><span className="booking-step-number">3.</span><span>Select Date &amp; Time</span></legend>
          <p className="booking-step-note">Times are shown in Eastern Time.</p>
          <AvailabilityCalendar today={today} value={date} onChange={(next) => { setDate(next); setSlot(""); setAutoPick(false); }} states={states} lastDate={lastDate} />
          {nextOpen && nextOpen.date !== date ? (
            <p className="booking-next-available"><button type="button" className="booking-link-button" onClick={jumpToNext}>Next available: {DAY_FORMAT.format(new Date(`${nextOpen.date}T12:00:00Z`))}</button></p>
          ) : null}
          <p className="booking-step-note" aria-live="polite">{loadError ? "" : availability ? (availability.slots.length ? "Choose an available time" : DATE_NOTES[availability.dateState] ?? "No times available") : "Loading times…"}</p>
          {loadError ? (
            <div role="alert">
              <p className="booking-field-note">Times could not be loaded.</p>
              <button type="button" className="booking-link-button booking-retry" onClick={refresh}>Try again</button>
            </div>
          ) : !availability ? (
            <div className="booking-time-grid" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <div className="booking-time-skeleton" key={index} />)}</div>
          ) : (
            GROUPS.map((group) => {
              const items = availability.grid.filter((item) => item.reason !== "past" && groupOf(item.label) === group.key);
              if (!items.length) return null;
              return (
                <div className="booking-time-group" key={group.key} role="group" aria-label={group.label}>
                  <h4>{group.label}</h4>
                  <div className="booking-time-grid" role="radiogroup" aria-label={`${group.label} times`}>
                    {items.map((item) => {
                      const free = item.available;
                      const reason = REASON_TEXT[item.reason] ?? "Unavailable";
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={activeSlot === item.startsAt}
                          aria-disabled={free ? undefined : "true"}
                          aria-label={free ? `${item.label}, with ${item.barberName}` : `${item.label}, ${reason}`}
                          title={free ? undefined : reason}
                          className={`booking-time-chip${activeSlot === item.startsAt ? " is-selected" : ""}`}
                          key={item.startsAt}
                          onClick={() => { if (free) { setSlot(item.startsAt); setAutoPick(false); } }}
                        >
                          <span>{item.label}</span>
                          {free ? <small>{item.barberName}</small> : <small className="booking-chip-lock"><Icon name="lock" size={10} /> {reason}</small>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
          {availability?.grid?.some((item) => item.reason === "past") ? <p className="booking-field-note">Earlier times today have already passed.</p> : null}
          <p className="booking-field-note"><Icon name="lock" size={10} /> Muted times are not available. Booked, blocked, breaks and times outside working hours stay visible so you can see why.</p>
        </fieldset>
      </div>

      <div className="booking-details-grid">
        <section className="booking-details-panel" aria-labelledby="booking-details-title">
          <div className="booking-panel-heading"><span className="booking-step-number">4.</span><div><h2 id="booking-details-title">Your Details</h2><p>Your account supplies your name and email.</p></div></div>
          <label className="booking-label booking-phone-field" htmlFor="booking-phone">Phone number <span className="booking-optional">Optional</span>
            <input id="booking-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 212 555 0100" />
          </label>
          <label className="booking-sms-consent"><input type="checkbox" checked={smsConsent} onChange={(event) => setSmsConsent(event.target.checked)} /> I agree to receive future SMS appointment reminders (optional).</label>
        </section>
        <aside className="booking-summary" aria-labelledby="booking-summary-title">
          <div className="booking-panel-heading"><span className="booking-step-number">5.</span><div><p className="eyebrow">Review your visit</p><h2 id="booking-summary-title">Booking Summary</h2></div></div>
          <dl>
            <div><dt>Services</dt><dd>{selectedServices.length ? selectedServices.map((item) => item.name).join(", ") : "Select a service"}</dd></div>
            <div><dt>Barber</dt><dd>{chosenSlot?.barberName || (barber === "any" ? "Any barber" : availability?.barbers?.find((item) => item.slug === barber)?.name || barber)}</dd></div>
            <div><dt>Date &amp; time</dt><dd>{chosenSlot ? `${date} · ${chosenSlot.label}` : "Choose an available time"}</dd></div>
            <div><dt>Price before tax</dt><dd>{priceIsConfigured ? formatMoney(total) : "To be confirmed"}</dd></div>
            <div><dt>Payment</dt><dd>At the shop</dd></div>
          </dl>
          {status ? <p className="booking-status" role="status" aria-live="polite">{status}{/sign in/i.test(status) ? <> <Link href={signInUrlFor(ROUTES.booking)}>Sign in</Link></> : null}</p> : null}
          <p className="booking-summary-note">Cancel or reschedule free up to 24 hours before your visit. After that, contact the shop for help.</p>
          <Button type="submit" className="booking-submit" icon="arrowRight" disabled={pending || !chosenSlot || !priceIsConfigured}>{pending ? "Confirming…" : "Confirm Appointment"}</Button>
        </aside>
      </div>
    </form>
  );
}
