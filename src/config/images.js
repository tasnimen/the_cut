// Single source for every image slot on the site. Components must read images through
// `getImage()` (src/lib/images/server.js) and never hard-code a path.
//
// Resolution order per slot: (1) a Super Admin override from a Media (ImgBB) record, passed in by
// the caller (Phase I), (2) a photo the owner placed at public/images/<file>.(webp|avif|jpg|jpeg|png),
// (3) the `fallback` below (an existing local asset or the neutral placeholder).

export const IMAGE_EXTENSIONS = Object.freeze(["webp", "avif", "jpg", "jpeg", "png"]);
export const PLACEHOLDER_SRC = "/images/image-placeholder.svg";

// Tiny navy blurred rectangle used as the blur placeholder for all slots.
export const BLUR_DATA_URL = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjUiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjUiIGZpbGw9IiMwNzE5MjMiLz48L3N2Zz4=";

const slot = (file, width, height, options = {}) => Object.freeze({
  file,
  width,
  height,
  focal: options.focal ?? "center",
  decorative: options.decorative ?? false,
  alt: options.alt ?? "",
  fallback: options.fallback ?? PLACEHOLDER_SRC,
  search: options.search ?? "",
  note: options.note ?? "",
});

export const SHARED_CARD_SRC = "/images/card-image.webp";
const SHARED_CARD = SHARED_CARD_SRC;
const BANNER_1 = "/images/banner1.webp";
const BANNER_2 = "/images/banner2.webp";

export const IMAGE_SLOTS = Object.freeze({
  // Heroes and banners
  hero: slot("hero", 1920, 1080, { focal: "center 54%", decorative: true, fallback: BANNER_1, search: "empty luxury barbershop interior dark leather chair warm light" }),
  "hero-mobile": slot("hero-mobile", 900, 1200, { focal: "center 54%", decorative: true, fallback: BANNER_1, search: "barbershop chair portrait orientation dark moody" }),
  "hero-about": slot("hero-about", 1920, 800, { focal: "center", decorative: true, fallback: BANNER_1, search: "barbershop interior wide dark" }),
  "hero-services": slot("hero-services", 1920, 800, { focal: "center", decorative: true, fallback: BANNER_1, search: "barber tools on counter dark wood" }),
  "hero-gallery": slot("hero-gallery", 1920, 800, { focal: "center", decorative: true, fallback: BANNER_2, search: "barbershop mirrors and lights dark" }),
  "hero-pricing": slot("hero-pricing", 1920, 800, { focal: "right center", decorative: true, fallback: BANNER_2, search: "straight razor scissors comb flat lay dark" }),
  "hero-contact": slot("hero-contact", 1920, 800, { focal: "right center", decorative: true, fallback: BANNER_1, search: "barbershop storefront or reception dark warm" }),
  "offer-banner": slot("offer-banner", 1600, 600, { decorative: true, fallback: BANNER_2, search: "grooming products bottles on dark shelf" }),
  "cta-background": slot("cta-background", 1920, 700, { decorative: true, fallback: BANNER_1, search: "dark barbershop interior bokeh lights" }),
  "footer-backdrop": slot("footer-backdrop", 1920, 500, { decorative: true, fallback: BANNER_2, search: "dark texture gold lines barbershop" }),

  // Services (shared sample image until real photos exist)
  "service-haircut": slot("service-haircut", 800, 600, { alt: "A haircut in progress", fallback: SHARED_CARD, search: "barber cutting hair close up scissors" }),
  "service-beard-trim": slot("service-beard-trim", 800, 600, { alt: "A beard trim", fallback: SHARED_CARD, search: "beard trim barber close up" }),
  "service-shave": slot("service-shave", 800, 600, { alt: "A straight-razor shave", fallback: SHARED_CARD, search: "straight razor shave hot towel" }),
  "service-hair-color": slot("service-hair-color", 800, 600, { alt: "Hair colour service", fallback: SHARED_CARD, search: "men hair coloring salon" }),
  "service-hair-treatment": slot("service-hair-treatment", 800, 600, { alt: "A hair and scalp treatment", fallback: SHARED_CARD, search: "scalp treatment men hair care" }),
  "service-combo": slot("service-combo", 800, 600, { alt: "A haircut and beard trim together", fallback: SHARED_CARD, search: "barber haircut and beard grooming" }),

  // Barber portraits: only photos of the actual barbers, with their consent
  "barber-daniel-carter": slot("barber-daniel-carter", 600, 750, { alt: "Portrait of Daniel Carter", note: "Real photo of this barber only" }),
  "barber-james-miller": slot("barber-james-miller", 600, 750, { alt: "Portrait of James Miller", note: "Real photo of this barber only" }),
  "barber-robert-wilson": slot("barber-robert-wilson", 600, 750, { alt: "Portrait of Robert Wilson", note: "Real photo of this barber only" }),
  "barber-michael-brown": slot("barber-michael-brown", 600, 750, { alt: "Portrait of Michael Brown", note: "Real photo of this barber only" }),

  // About and gallery
  "team-intro": slot("team-intro", 1200, 1000, { decorative: true, fallback: BANNER_2, search: "barbers working side by side dark shop" }),
  "about-story": slot("about-story", 1200, 900, { alt: "Inside The Cut barbershop", fallback: BANNER_2, search: "barbershop interior warm lights vintage chairs" }),
  "gallery-studio-wide": slot("gallery-studio-wide", 1200, 800, { alt: "A quiet corner of the studio", fallback: BANNER_2, search: "barbershop interior wide angle" }),
  "gallery-barber-chair": slot("gallery-barber-chair", 900, 1200, { alt: "The chair, ready for the day", fallback: BANNER_1, search: "barber chair leather vintage" }),
  "gallery-scissors-detail": slot("gallery-scissors-detail", 1000, 1000, { alt: "Scissors and comb on the counter", fallback: SHARED_CARD, search: "barber scissors comb close up" }),
  "gallery-04": slot("gallery-04", 1200, 800, { alt: "A haircut finished at The Cut", search: "fade haircut side view" }),
  "gallery-05": slot("gallery-05", 1200, 800, { alt: "A groomed beard", search: "beard grooming close up" }),
  "gallery-06": slot("gallery-06", 1200, 800, { alt: "A hot towel shave", search: "barbershop detail hot towel" }),
  "gallery-07": slot("gallery-07", 1200, 800, { alt: "A finished hairstyle", search: "barber tools razor brush" }),
  "gallery-08": slot("gallery-08", 1200, 800, { alt: "An event at the shop", search: "barbershop shop front night" }),

  // Other
  pricing: slot("pricing", 1600, 700, { decorative: true, fallback: BANNER_2, search: "barber razor comb scissors flat lay" }),
  "contact-map-backdrop": slot("contact-map-backdrop", 1200, 800, { decorative: true, fallback: BANNER_2, search: "dark city map abstract navy gold" }),
  "product-1": slot("product-1", 800, 800, { alt: "Grooming product", note: "Future Shop", search: "pomade tin dark background product" }),
  "product-2": slot("product-2", 800, 800, { alt: "Grooming product", note: "Future Shop", search: "beard oil bottle product dark" }),
  "product-3": slot("product-3", 800, 800, { alt: "Grooming product", note: "Future Shop", search: "shaving brush and soap product" }),
});

export const IMAGE_SLOT_KEYS = Object.freeze(Object.keys(IMAGE_SLOTS));
