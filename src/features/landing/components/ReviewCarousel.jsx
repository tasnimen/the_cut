"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CardImage } from "@/components/ui/CardImage";
import { sampleReviews } from "@/features/landing/data/reviews";
import { sharedCardImage } from "@/features/landing/data/cardImage";

const AUTOPLAY_DELAY = 4600;

function scrollToReview(track, index, behavior) {
  const slide = track?.children[index];
  if (!track || !slide) return;
  const left = slide.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
  track.scrollTo({ left, behavior });
}

export function ReviewCarousel({ reviews = sampleReviews, imageSrc = sharedCardImage.src }) {
  const trackRef = useRef(null);
  const activeIndexRef = useRef(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [requestedStartIndex, setStartIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const lastStartIndex = Math.max(0, safeReviews.length - visibleCount);
  const startIndex = Math.min(requestedStartIndex, lastStartIndex);
  const isPaused = hovered || focused || interacting || reducedMotion;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || safeReviews.length === 0) return undefined;

    const measureSlides = () => {
      const firstSlide = track.firstElementChild;
      if (!firstSlide) return;
      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const slideWidth = firstSlide.getBoundingClientRect().width;
      const count = Math.max(1, Math.floor((track.clientWidth + gap) / (slideWidth + gap)));
      setVisibleCount(Math.min(count, safeReviews.length));
    };

    measureSlides();
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(measureSlides);
      observer.observe(track);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", measureSlides);
    return () => window.removeEventListener("resize", measureSlides);
  }, [safeReviews.length]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (safeReviews.length < 2 || isPaused) return undefined;

    const timer = window.setInterval(() => {
      const maxIndex = Math.max(0, safeReviews.length - visibleCount);
      const nextIndex = activeIndexRef.current >= maxIndex ? 0 : activeIndexRef.current + 1;
      const track = trackRef.current;
      const behavior = reducedMotion ? "auto" : "smooth";
      scrollToReview(track, nextIndex, behavior);
      activeIndexRef.current = nextIndex;
      setStartIndex(nextIndex);
    }, AUTOPLAY_DELAY);

    return () => window.clearInterval(timer);
  }, [isPaused, reducedMotion, safeReviews.length, visibleCount]);

  function goTo(index) {
    const track = trackRef.current;
    if (!track || safeReviews.length === 0) return;
    const targetIndex = Math.min(Math.max(index, 0), lastStartIndex);
    const behavior = reducedMotion ? "auto" : "smooth";
    scrollToReview(track, targetIndex, behavior);
    activeIndexRef.current = targetIndex;
    setStartIndex(targetIndex);
  }

  function handleScroll() {
    const track = trackRef.current;
    const firstSlide = track?.firstElementChild;
    if (!track || !firstSlide) return;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const step = firstSlide.getBoundingClientRect().width + gap;
    const index = Math.round(track.scrollLeft / step);
    const safeIndex = Math.min(Math.max(index, 0), lastStartIndex);
    activeIndexRef.current = safeIndex;
    setStartIndex(safeIndex);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowRight" && startIndex < lastStartIndex) {
      event.preventDefault();
      goTo(startIndex + 1);
    }
    if (event.key === "ArrowLeft" && startIndex > 0) {
      event.preventDefault();
      goTo(startIndex - 1);
    }
  }

  if (safeReviews.length === 0) {
    return <p className="review-empty">Reviews will appear here when approved customer feedback is available.</p>;
  }

  return (
    <div
      className="review-carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onPointerDown={() => setInteracting(true)}
      onPointerUp={() => setInteracting(false)}
      onPointerCancel={() => setInteracting(false)}
    >
      <div className="review-carousel-controls">
        <span className="sr-only">Sample review content. Approved client reviews have not been provided.</span>
        <div className="carousel-arrows">
          <Button
            className="carousel-control"
            variant="control"
            size="control"
            icon="arrowLeft"
            aria-label="Previous reviews"
            onClick={() => goTo(startIndex - 1)}
            disabled={startIndex <= 0}
          />
          <Button
            className="carousel-control"
            variant="control"
            size="control"
            icon="arrowRight"
            aria-label="Next reviews"
            onClick={() => goTo(startIndex + 1)}
            disabled={startIndex >= lastStartIndex}
          />
        </div>
      </div>
      <div
        className="review-track"
        ref={trackRef}
        role="region"
        aria-label="Client review samples"
        aria-roledescription="carousel"
        aria-live="off"
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
      >
        {safeReviews.map((review, index) => (
          <article
            className="review-card"
            key={review.id ?? `sample-${index}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${safeReviews.length}`}
          >
            <div className="review-card-heading">
              <CardImage src={imageSrc} className="review-avatar-image" sizes="48px" />
              <span className="sample-review-label">Sample client story</span>
            </div>
            <p>“{review.quote}”</p>
            <div className="review-rating">
              <span aria-hidden="true">★★★★★</span>
              <small>Sample 5-star rating</small>
            </div>
          </article>
        ))}
      </div>
      <div className="carousel-pagination" role="group" aria-label="Choose a review position">
        {Array.from({ length: lastStartIndex + 1 }, (_, index) => (
          <button
            className="carousel-dot"
            type="button"
            key={index}
            aria-label={`Show review position ${index + 1}`}
            aria-current={startIndex === index ? "true" : undefined}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
      <p className="review-image-note">The same supplied card image is reused in these sample cards.</p>
    </div>
  );
}
