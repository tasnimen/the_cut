"use client";

import Image from "next/image";
import { useState } from "react";
import { BLUR_DATA_URL } from "@/config/images";

const PLACEHOLDER = "/images/image-placeholder.svg";

export function ImageWithFallback({ src, alt, onError, ...props }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
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
