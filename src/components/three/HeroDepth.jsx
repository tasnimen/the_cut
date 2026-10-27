"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const GoldDustCanvas = dynamic(() => import("@/components/three/GoldDustCanvas"), {
  ssr: false,
  loading: () => null,
});

export function HeroDepth() {
  const hostRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lowPower =
      (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    if (motionPreference.matches || lowPower) return undefined;

    let idleId;
    let timerId;
    const host = hostRef.current;
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.01 })
      : null;

    if (observer && host) observer.observe(host);
    else setInView(true);

    const loadAtIdle = () => setReady(true);
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(loadAtIdle, { timeout: 2400 });
    } else {
      timerId = window.setTimeout(loadAtIdle, 1100);
    }

    const handleMotionChange = (event) => {
      if (event.matches) setReady(false);
    };
    motionPreference.addEventListener("change", handleMotionChange);

    return () => {
      observer?.disconnect();
      motionPreference.removeEventListener("change", handleMotionChange);
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <div ref={hostRef} className="hero-depth" aria-hidden="true">
      <div className="hero-depth-fallback" />
      {ready && inView ? <GoldDustCanvas /> : null}
    </div>
  );
}
