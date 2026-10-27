"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { galleryItems } from "@/features/marketing/data/gallery";

const categories = ["All", ...new Set(galleryItems.map(({ category }) => category))];

export function GalleryGrid() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null);
  const dialogRef = useRef(null);
  const visibleItems = useMemo(
    () => galleryItems.filter((item) => activeCategory === "All" || item.category === activeCategory),
    [activeCategory],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedItem && !dialog.open) dialog.showModal();
    if (!selectedItem && dialog.open) dialog.close();
  }, [selectedItem]);

  return (
    <>
      <div className="gallery-filters" aria-label="Filter gallery images">
        {categories.map((category) => (
          <button
            aria-pressed={activeCategory === category}
            className="gallery-filter"
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>
      <div className="gallery-grid" aria-live="polite">
        {visibleItems.map((item) => (
          <figure className={`gallery-card gallery-card--${item.shape}`} key={item.id}>
            <button className="gallery-card-button" onClick={() => setSelectedItem(item)} type="button">
              <Image alt={item.alt} className="gallery-card-image" fill sizes="(max-width: 760px) 100vw, 50vw" src={item.image} />
              <span className="gallery-card-open">View image</span>
            </button>
            <figcaption>
              <span>{item.category}</span>
              <strong>{item.title}</strong>
            </figcaption>
          </figure>
        ))}
      </div>
      <dialog
        aria-label={selectedItem?.title || "Gallery image"}
        className="gallery-dialog"
        onCancel={(event) => { event.preventDefault(); setSelectedItem(null); }}
        onClick={(event) => { if (event.target === dialogRef.current) setSelectedItem(null); }}
        ref={dialogRef}
      >
        {selectedItem ? (
          <div className="gallery-dialog-content">
            <button aria-label="Close image" className="gallery-dialog-close" onClick={() => setSelectedItem(null)} type="button">Close</button>
            <Image alt={selectedItem.alt} className="gallery-dialog-image" fill sizes="90vw" src={selectedItem.image} />
            <p>{selectedItem.title}</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
