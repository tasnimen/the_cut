"use client";

import { useEffect, useRef } from "react";

export function ScrollReveal({
  as: Element = "div",
  children,
  className = "",
  stagger = false,
  ...props
}) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    const revealImmediately = () => {
      element.dataset.revealVisible = "true";
    };

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      revealImmediately();
      return undefined;
    }

    element.dataset.revealReady = "true";
    try {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          revealImmediately();
          observer.unobserve(element);
        },
        { threshold: 0.12, rootMargin: "0px 0px -42px 0px" },
      );

      observer.observe(element);
      return () => observer.disconnect();
    } catch {
      revealImmediately();
      return undefined;
    }
  }, []);

  return (
    <Element
      {...props}
      ref={elementRef}
      className={`scroll-reveal${stagger ? " scroll-reveal-stagger" : ""} ${className}`.trim()}
      data-reveal=""
    >
      {children}
    </Element>
  );
}
