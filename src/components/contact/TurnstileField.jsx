"use client";

import { useEffect, useRef, useState } from "react";

const SCRIPT_ID = "cloudflare-turnstile-api";

export function TurnstileField({ siteKey }) {
  const containerRef = useRef(null);
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined;
    let widgetId;
    let disposed = false;
    const renderWidget = () => {
      if (disposed || !window.turnstile || !containerRef.current) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (value) => setToken(value),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
      setReady(true);
    };

    const existing = document.getElementById(SCRIPT_ID);
    if (window.turnstile) {
      renderWidget();
    } else if (existing) {
      existing.addEventListener("load", renderWidget, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderWidget, { once: true });
      script.addEventListener("error", () => setLoadFailed(true), { once: true });
      document.head.append(script);
    }

    return () => {
      disposed = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) return <input name="captchaToken" type="hidden" value="" />;

  return (
    <div className="contact-captcha" aria-label="Spam protection">
      <div ref={containerRef} />
      <input name="captchaToken" type="hidden" value={token} />
      <span className="contact-captcha-status" aria-live="polite">{loadFailed ? "Spam protection could not load. Refresh and try again." : ready ? "Spam protection ready." : "Loading spam protection…"}</span>
    </div>
  );
}
