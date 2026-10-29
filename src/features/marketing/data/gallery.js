export const galleryItems = Object.freeze([
  Object.freeze({
    id: "studio-wide",
    category: "Studio",
    title: "A quiet corner of the studio",
    alt: "Concept image of a dark barbershop interior with warm lighting",
    shape: "wide",
    sample: true,
  }),
  Object.freeze({
    id: "barber-chair",
    category: "Studio",
    title: "The chair, ready for the day",
    alt: "Concept image of a barber chair in a warmly lit studio",
    shape: "tall",
    sample: true,
  }),
  Object.freeze({
    id: "scissors-detail",
    category: "Tools & details",
    title: "Tools of the trade",
    alt: "Watermarked stock illustration of crossed barber scissors",
    shape: "square",
    sample: true,
  }),
  // Shown only once the owner adds the photo for the matching slot (see docs/IMAGE_SLOTS.md).
  Object.freeze({ id: "04", category: "Haircuts", title: "Haircut", alt: "A haircut finished at The Cut", shape: "square" }),
  Object.freeze({ id: "05", category: "Beards", title: "Beard grooming", alt: "A groomed beard", shape: "square" }),
  Object.freeze({ id: "06", category: "Shaves", title: "Shave", alt: "A hot towel shave", shape: "square" }),
  Object.freeze({ id: "07", category: "Styles", title: "Styling", alt: "A finished hairstyle", shape: "square" }),
  Object.freeze({ id: "08", category: "Events", title: "Shop event", alt: "An event at the shop", shape: "square" }),
]);

export const GALLERY_CATEGORY_ORDER = Object.freeze(["Haircuts", "Beards", "Shaves", "Styles", "Events", "Studio", "Tools & details"]);

// An item is shown if it is a labelled sample, or its photo has been added.
export function visibleGalleryItems(items, hasPhoto) {
  return items.filter((item) => item.sample || hasPhoto(item));
}

// Tabs follow the mockup order and only list categories that have visible items.
export function galleryCategories(items) {
  const present = new Set(items.map((item) => item.category));
  const ordered = GALLERY_CATEGORY_ORDER.filter((category) => present.has(category));
  const extra = [...present].filter((category) => !GALLERY_CATEGORY_ORDER.includes(category));
  return ["All", ...ordered, ...extra];
}
