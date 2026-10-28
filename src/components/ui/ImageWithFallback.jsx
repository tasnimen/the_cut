"use client";

import Image from "next/image";
import { useState } from "react";

const PLACEHOLDER = "/images/image-placeholder.svg";

export function ImageWithFallback({ src, alt, onError, ...props }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      {...props}
      alt={failed && alt ? `Image unavailable: ${alt}` : alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
      src={failed ? PLACEHOLDER : src}
    />
  );
}
