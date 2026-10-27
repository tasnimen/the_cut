"use client";

import { useEffect } from "react";

export function SmoothScrollProvider({ children }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let cleanup = () => {};
    let idleHandle;

    async function startSmoothScroll() {
      if (cancelled || reducedMotion.matches) return;

      const [lenisModule, gsapModule, scrollTriggerModule] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (cancelled || reducedMotion.matches) return;

      const Lenis = lenisModule.default;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({ autoRaf: false });
      const onTick = (time) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(onTick);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        gsap.ticker.remove(onTick);
        lenis.destroy();
      };
    }

    const schedule = () => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(startSmoothScroll, { timeout: 1800 });
      } else {
        idleHandle = window.setTimeout(startSmoothScroll, 800);
      }
    };

    const handleMotionChange = () => {
      if (reducedMotion.matches) cleanup();
      else schedule();
    };

    schedule();
    reducedMotion.addEventListener("change", handleMotionChange);

    return () => {
      cancelled = true;
      reducedMotion.removeEventListener("change", handleMotionChange);
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);
      cleanup();
    };
  }, []);

  return children;
}
