"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { DatePreferencePicker } from "@/features/booking/components/DatePreferencePicker";
import { BookingProgress } from "@/features/booking/components/BookingProgress";
import { services } from "@/features/landing/data/services";

export function BookingForm({ today }) {
  const [selectedService, setSelectedService] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [status, setStatus] = useState("");
  const chosenService = services.find((service) => service.number === selectedService);
  const formattedDate = preferredDate
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${preferredDate}T12:00:00`))
    : "Choose a date";

  function handleSubmit(event) {
    event.preventDefault();
    setStatus("Preview only: no booking service is connected. Your details have not been sent or saved.");
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <BookingProgress />

      <div className="booking-step-grid">
        <fieldset className="booking-step-panel booking-service-panel">
          <legend><span className="booking-step-number">1.</span><span>Choose Service</span></legend>
          <p className="booking-step-note">Illustrative menu</p>
          <div className="booking-service-options">
            {services.map((service) => (
              <label className={`booking-service-option${selectedService === service.number ? " is-selected" : ""}`} key={service.number}>
                <span className="booking-service-icon" aria-hidden="true"><Icon name={service.icon} size={15} /></span>
                <span className="booking-service-copy">
                  <span>{service.name}</span>
                  <small>{service.detail}</small>
                </span>
                <input
                  type="radio"
                  name="service"
                  value={service.number}
                  checked={selectedService === service.number}
                  onChange={(event) => setSelectedService(event.target.value)}
                  required
                  aria-label={`Select ${service.name}`}
                />
              </label>
            ))}
          </div>
          <p className="booking-field-note">Final menu and prices are not confirmed.</p>
        </fieldset>

        <fieldset className="booking-step-panel booking-barber-panel">
          <legend><span className="booking-step-number">2.</span><span>Select Barber</span></legend>
          <p className="booking-step-note">Choose who you’d like to see</p>
          <label className="booking-preference-option">
            <span className="booking-barber-mark" aria-hidden="true">TC</span>
            <span className="booking-preference-copy"><strong>No preference</strong><small>No specific barber selected</small></span>
            <input type="radio" name="barber" value="no-preference" defaultChecked aria-label="No barber preference" />
          </label>
          <p className="booking-field-note">Barber names and schedules are not available yet.</p>
        </fieldset>

        <fieldset className="booking-step-panel booking-date-panel">
          <legend><span className="booking-step-number">3.</span><span>Select Date &amp; Time</span></legend>
          <p className="booking-step-note">Choose a preferred date</p>
          <DatePreferencePicker
            today={today}
            value={preferredDate}
            onChange={setPreferredDate}
            time={preferredTime}
            onTimeChange={setPreferredTime}
          />
        </fieldset>
      </div>

      <div className="booking-details-grid">
        <section className="booking-details-panel" aria-labelledby="booking-details-title">
          <div className="booking-panel-heading">
            <span className="booking-step-number">4.</span>
            <div>
              <h2 id="booking-details-title">Your Details</h2>
              <p>Enter your contact information</p>
            </div>
          </div>
          <div className="booking-input-grid">
            <label className="booking-label" htmlFor="customer-name">
              Full name <span aria-hidden="true">*</span>
              <input id="customer-name" type="text" autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
            </label>
            <label className="booking-label" htmlFor="customer-email">
              Email address <span aria-hidden="true">*</span>
              <input id="customer-email" type="email" autoComplete="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required />
            </label>
            <label className="booking-label booking-phone-field" htmlFor="customer-phone">
              Phone number <span className="booking-optional">Optional</span>
              <input id="customer-phone" type="tel" autoComplete="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
            </label>
          </div>
        </section>

        <aside className="booking-summary" aria-labelledby="booking-summary-title">
          <div className="booking-panel-heading">
            <span className="booking-step-number">5.</span>
            <div>
              <p className="eyebrow">Review your visit</p>
              <h2 id="booking-summary-title">Booking Summary</h2>
            </div>
          </div>
          <dl>
            <div><dt>Service</dt><dd>{chosenService?.name ?? "Select a service"}</dd></div>
            <div><dt>Barber</dt><dd>No preference</dd></div>
            <div><dt>Preferred date</dt><dd>{preferredDate ? formattedDate : "Choose a date"}</dd></div>
            <div><dt>Preferred time</dt><dd>{preferredTime || "Choose a time"}</dd></div>
            <div><dt>Name</dt><dd>{customerName || "Enter your name"}</dd></div>
          </dl>
          {status ? <p className="booking-status" role="status" aria-live="polite">{status}</p> : null}
          <p className="booking-summary-note">Preview only. Nothing is sent or saved, and this is not an appointment confirmation.</p>
          <Button type="submit" className="booking-submit" icon="arrowRight">Review Request</Button>
        </aside>
      </div>
    </form>
  );
}
