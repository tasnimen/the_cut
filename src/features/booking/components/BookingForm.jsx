"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { BookingProgress } from "@/features/booking/components/BookingProgress";
import { services } from "@/features/landing/data/services";
import { ROUTES } from "@/config/routes";
import { useRouter } from "next/navigation";
import { signInUrlFor } from "@/lib/auth/callback";
import { notify } from "@/lib/toast/notify";
import { toastKeyForStatus } from "@/lib/toast/messages";
import { formatMoney } from "@/lib/format/money";


export function BookingForm({ today, initialServiceSlugs = [] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialServiceSlugs.length ? initialServiceSlugs : [services[0]?.slug].filter(Boolean));
  const [date, setDate] = useState(today);
  const [barber, setBarber] = useState("any");
  const [options, setOptions] = useState(null);
  const [slot, setSlot] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const queryKey = `${date}|${barber}|${selected.join(",")}`;
  const availability = options?.queryKey === queryKey ? options.data : null;
  const selectedServices = useMemo(() => selected.map((slug) => availability?.services?.find((item) => item.slug === slug) || services.find((item) => item.slug === slug)).filter(Boolean), [selected, availability]);

  useEffect(() => {
    if (!date || selected.length < 1) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ date, barber });
    selected.forEach((slug) => query.append("service", slug));
    fetch(`/api/bookings/availability?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "availability_unavailable");
        setOptions({ queryKey, data: body });
      })
      .catch((error) => { if (error.name !== "AbortError") setStatus("Availability could not be loaded. Please retry."); });
    return () => controller.abort();
  }, [date, barber, selected, queryKey]);

  const priceIsConfigured = selectedServices.every((item) => Number.isInteger(item.priceMinorUnits));
  const total = selectedServices.reduce((sum, item) => sum + (item.priceMinorUnits || 0), 0);
  const chosenSlot = availability?.slots?.find((item) => item.startsAt === slot);

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
        body: JSON.stringify({ serviceSlugs: selected, startsAt: slot, barber, phone, smsConsent }),
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
        notify(result.error === "slot_just_taken" || result.error === "slot_unavailable" ? "slotTaken" : toastKeyForStatus(response.status, "bookingFailure"));
        setStatus(result.error === "slot_just_taken" || result.error === "slot_unavailable"
          ? "That time was just taken. Choose another available time."
          : "Your booking could not be completed. Please retry.");
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
            {services.map((service) => (
              <label className={`booking-service-option${selected.includes(service.slug) ? " is-selected" : ""}`} key={service.slug}>
                <span className="booking-service-icon" aria-hidden="true"><Icon name={service.icon} size={15} /></span>
                <span className="booking-service-copy"><span>{service.name}</span><small>{service.durationMinutes} minutes</small></span>
                <span className="booking-service-price">{Number.isInteger(service.priceMinorUnits) ? formatMoney(service.priceMinorUnits) : "TBC"}</span>
                <input type="checkbox" value={service.slug} checked={selected.includes(service.slug)} onChange={() => toggleService(service.slug)} aria-label={`Select ${service.name}`} />
              </label>
            ))}
          </div>
          {!priceIsConfigured ? <p className="booking-field-note">Online confirmation opens when all service prices are set.</p> : null}
        </fieldset>

        <fieldset className="booking-step-panel booking-barber-panel">
          <legend><span className="booking-step-number">2.</span><span>Select Barber</span></legend>
          <p className="booking-step-note">Available barbers are shown for this service.</p>
          <div className="booking-preference-list" role="radiogroup" aria-label="Barber">
            {[{ id: "any", slug: "any", name: "Any barber" }, ...(availability?.barbers ?? [])].map((item) => (
              <label className="booking-preference-option" key={item.id}>
                <span className="booking-barber-mark" aria-hidden="true">{item.slug === "any" ? "★" : item.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                <span className="booking-preference-copy">
                  <strong>{item.name}</strong>
                  {item.slug === "any" ? <small>Assigns the least-booked eligible barber</small> : null}
                </span>
                <input type="radio" name="barber" value={item.slug} checked={barber === item.slug} onChange={() => setBarber(item.slug)} />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="booking-step-panel booking-date-panel">
          <legend><span className="booking-step-number">3.</span><span>Select Date &amp; Time</span></legend>
          <p className="booking-step-note">Times are shown in Eastern Time.</p>
          <label className="booking-label" htmlFor="booking-date">Date
            <input id="booking-date" type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <p className="booking-step-note">{availability ? (availability.slots.length ? "Choose an available time" : "No times available") : "Loading times…"}</p>
          <div className="booking-time-grid" role="radiogroup" aria-label="Available times">
            {availability?.slots?.map((item) => (
              <button
                type="button"
                role="radio"
                aria-checked={slot === item.startsAt}
                className={`booking-time-chip${slot === item.startsAt ? " is-selected" : ""}`}
                key={item.startsAt}
                onClick={() => setSlot(item.startsAt)}
              >
                <span>{item.label}</span>
                <small>{item.barberName}</small>
              </button>
            ))}
          </div>
          {availability && !availability.slots.length ? <p className="booking-field-note">No appointments are available for this date. Try another day.</p> : null}
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
