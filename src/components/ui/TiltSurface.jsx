"use client";

import { Surface } from "@/components/ui/Surface";
import { useRef } from "react";

const MAX_TILT = 4;

function clearTilt(element) {
  element.style.setProperty("--tilt-x", "0deg");
  element.style.setProperty("--tilt-y", "0deg");
  element.style.setProperty("--tilt-z", "0px");
}

export function TiltSurface({ className = "", children, ...props }) {
  const idleTimerRef = useRef(null);

  function handlePointerMove(event) {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    const element = event.currentTarget;
    const bounds = element.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    window.clearTimeout(idleTimerRef.current);
    element.style.willChange = "transform";
    element.style.setProperty("--tilt-x", `${y * -MAX_TILT}deg`);
    element.style.setProperty("--tilt-y", `${x * MAX_TILT}deg`);
    element.style.setProperty("--tilt-z", "5px");
    idleTimerRef.current = window.setTimeout(() => {
      element.style.willChange = "";
    }, 180);
  }

  function handlePointerLeave(event) {
    const element = event.currentTarget;
    window.clearTimeout(idleTimerRef.current);
    clearTilt(element);
    element.style.willChange = "transform";
    idleTimerRef.current = window.setTimeout(() => {
      element.style.willChange = "";
    }, 300);
  }

  return (
    <Surface
      className={`surface--tilt ${className}`.trim()}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {children}
    </Surface>
  );
}
