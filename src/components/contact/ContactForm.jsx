"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactMessage } from "@/app/contact/actions";
import { Button } from "@/components/ui/Button";
import { notify } from "@/lib/toast/notify";
import { TurnstileField } from "@/components/contact/TurnstileField";

const INITIAL_STATE = Object.freeze({ status: "idle", message: "" });

export function ContactForm({ formTicket, captchaSiteKey }) {
  const [state, formAction, pending] = useActionState(submitContactMessage, INITIAL_STATE);
  const formRef = useRef(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
    if (state.status === "success") notify("contactSent");
    if (state.status === "error") notify("contactFailure");
  }, [state]);

  return (
    <section className="contact-card contact-form-card" aria-labelledby="contact-form-title">
      <h2 id="contact-form-title">Send us a message</h2>
      <p className="contact-form-lead">Share a question or tell us what you need. Your message is saved for the team to follow up.</p>
      <form action={formAction} className="contact-form" ref={formRef}>
        <input name="formTicket" type="hidden" value={formTicket} />
        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor="contact-website">Leave this field empty</label>
          <input autoComplete="off" id="contact-website" name="website" tabIndex={-1} type="text" />
        </div>
        <label className="contact-field" htmlFor="contact-name">
          <span>Full name</span>
          <input autoComplete="name" id="contact-name" maxLength={100} name="name" required type="text" />
        </label>
        <label className="contact-field" htmlFor="contact-email">
          <span>Email address</span>
          <input autoComplete="email" id="contact-email" maxLength={320} name="email" required type="email" />
        </label>
        <label className="contact-field contact-field--wide" htmlFor="contact-message">
          <span>Message</span>
          <textarea id="contact-message" maxLength={5000} minLength={10} name="message" required rows={6} />
        </label>
        <TurnstileField key={state.resetToken || 0} siteKey={captchaSiteKey} />
        <Button className="contact-submit" disabled={pending} icon="arrowUpRight" type="submit">
          {pending ? "Sending…" : "Send Message"}
        </Button>
        {state.message ? (
          <p className={`contact-form-feedback contact-form-feedback--${state.status}`} role={state.status === "error" ? "alert" : "status"}>
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
