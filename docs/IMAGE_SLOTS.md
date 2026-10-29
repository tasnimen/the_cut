# Image slots

Single source: `src/config/images.js`. Components read images only through `getImage(slot)` (`src/lib/images/server.js`); none hard-codes a path.

**How to add a photo:** save it as `public/images/<file>` using the filename in the table (accepted extensions, in priority order: webp, avif, jpg, jpeg, png), then restart the dev server or rebuild. Until then the slot uses its fallback (an existing local asset or the neutral placeholder). Phase I: a Super Admin can override any slot with an uploaded ImgBB Media record (only `https://i.ibb.co/` URLs are accepted); the local file stays the fallback.

**Rules for photos:** license-free only (Unsplash, Pexels or your own); no recognizable brand logos; **no real identifiable people unless they consented**: barber portraits must be the actual barbers. Compress each to about 200 KB or less (WebP, quality 75–82) at the recommended size. Record every photo's source and license in `docs/IMAGE_CREDITS.md`. The two project banners were compressed to `banner1.webp` (71 KB) and `banner2.webp` (129 KB); the original PNGs are in `docs/design/originals/`.

| Slot | File to add | Size (aspect) | Search phrase (Unsplash / Pexels) | Current fallback | Notes | Source / license |
|---|---|---|---|---|---|---|
| `hero` | `public/images/hero.webp` | 1920×1080 (16:9) | `empty luxury barbershop interior dark leather chair warm light` | `banner1.webp` | decorative (empty alt) | _not added_ |
| `hero-mobile` | `public/images/hero-mobile.webp` | 900×1200 (3:4) | `barbershop chair portrait orientation dark moody` | `banner1.webp` | decorative (empty alt) | _not added_ |
| `hero-about` | `public/images/hero-about.webp` | 1920×800 (12:5) | `barbershop interior wide dark` | `banner1.webp` | decorative (empty alt) | _not added_ |
| `hero-services` | `public/images/hero-services.webp` | 1920×800 (12:5) | `barber tools on counter dark wood` | `banner1.webp` | decorative (empty alt) | _not added_ |
| `hero-gallery` | `public/images/hero-gallery.webp` | 1920×800 (12:5) | `barbershop mirrors and lights dark` | `banner2.webp` | decorative (empty alt) | _not added_ |
| `hero-pricing` | `public/images/hero-pricing.webp` | 1920×800 (12:5) | `straight razor scissors comb flat lay dark` | `banner2.webp` | decorative (empty alt) | _not added_ |
| `hero-contact` | `public/images/hero-contact.webp` | 1920×800 (12:5) | `barbershop storefront or reception dark warm` | `banner1.webp` | decorative (empty alt) | _not added_ |
| `offer-banner` | `public/images/offer-banner.webp` | 1600×600 (8:3) | `grooming products bottles on dark shelf` | `banner2.webp` | decorative (empty alt) | _not added_ |
| `cta-background` | `public/images/cta-background.webp` | 1920×700 (96:35) | `dark barbershop interior bokeh lights` | `banner1.webp` | decorative (empty alt) | _not added_ |
| `footer-backdrop` | `public/images/footer-backdrop.webp` | 1920×500 (96:25) | `dark texture gold lines barbershop` | `banner2.webp` | decorative (empty alt) | _not added_ |
| `service-haircut` | `public/images/service-haircut.webp` | 800×600 (4:3) | `barber cutting hair close up scissors` | `card-image.webp` |  | _not added_ |
| `service-beard-trim` | `public/images/service-beard-trim.webp` | 800×600 (4:3) | `beard trim barber close up` | `card-image.webp` |  | _not added_ |
| `service-shave` | `public/images/service-shave.webp` | 800×600 (4:3) | `straight razor shave hot towel` | `card-image.webp` |  | _not added_ |
| `service-hair-color` | `public/images/service-hair-color.webp` | 800×600 (4:3) | `men hair coloring salon` | `card-image.webp` |  | _not added_ |
| `service-hair-treatment` | `public/images/service-hair-treatment.webp` | 800×600 (4:3) | `scalp treatment men hair care` | `card-image.webp` |  | _not added_ |
| `service-combo` | `public/images/service-combo.webp` | 800×600 (4:3) | `barber haircut and beard grooming` | `card-image.webp` |  | _not added_ |
| `barber-daniel-carter` | `public/images/barber-daniel-carter.webp` | 600×750 (4:5) | — | `image-placeholder.svg` | Real photo of this barber only | _not added_ |
| `barber-james-miller` | `public/images/barber-james-miller.webp` | 600×750 (4:5) | — | `image-placeholder.svg` | Real photo of this barber only | _not added_ |
| `barber-robert-wilson` | `public/images/barber-robert-wilson.webp` | 600×750 (4:5) | — | `image-placeholder.svg` | Real photo of this barber only | _not added_ |
| `barber-michael-brown` | `public/images/barber-michael-brown.webp` | 600×750 (4:5) | — | `image-placeholder.svg` | Real photo of this barber only | _not added_ |
| `team-intro` | `public/images/team-intro.webp` | 1200×1000 (6:5) | `barbers working side by side dark shop` | `banner2.webp` | decorative (empty alt) | _not added_ |
| `about-story` | `public/images/about-story.webp` | 1200×900 (4:3) | `barbershop interior warm lights vintage chairs` | `banner2.webp` |  | _not added_ |
| `gallery-studio-wide` | `public/images/gallery-studio-wide.webp` | 1200×800 (3:2) | `barbershop interior wide angle` | `banner2.webp` |  | _not added_ |
| `gallery-barber-chair` | `public/images/gallery-barber-chair.webp` | 900×1200 (3:4) | `barber chair leather vintage` | `banner1.webp` |  | _not added_ |
| `gallery-scissors-detail` | `public/images/gallery-scissors-detail.webp` | 1000×1000 (1:1) | `barber scissors comb close up` | `card-image.webp` |  | _not added_ |
| `gallery-04` | `public/images/gallery-04.webp` | 1200×800 (3:2) | `fade haircut side view` | `image-placeholder.svg` |  | _not added_ |
| `gallery-05` | `public/images/gallery-05.webp` | 1200×800 (3:2) | `beard grooming close up` | `image-placeholder.svg` |  | _not added_ |
| `gallery-06` | `public/images/gallery-06.webp` | 1200×800 (3:2) | `barbershop detail hot towel` | `image-placeholder.svg` |  | _not added_ |
| `gallery-07` | `public/images/gallery-07.webp` | 1200×800 (3:2) | `barber tools razor brush` | `image-placeholder.svg` |  | _not added_ |
| `gallery-08` | `public/images/gallery-08.webp` | 1200×800 (3:2) | `barbershop shop front night` | `image-placeholder.svg` |  | _not added_ |
| `pricing` | `public/images/pricing.webp` | 1600×700 (16:7) | `barber razor comb scissors flat lay` | `banner2.webp` | decorative (empty alt) | _not added_ |
| `contact-map-backdrop` | `public/images/contact-map-backdrop.webp` | 1200×800 (3:2) | `dark city map abstract navy gold` | `banner2.webp` | decorative (empty alt) | _not added_ |
| `product-1` | `public/images/product-1.webp` | 800×800 (1:1) | `pomade tin dark background product` | `image-placeholder.svg` | Future Shop | _not added_ |
| `product-2` | `public/images/product-2.webp` | 800×800 (1:1) | `beard oil bottle product dark` | `image-placeholder.svg` | Future Shop | _not added_ |
| `product-3` | `public/images/product-3.webp` | 800×800 (1:1) | `shaving brush and soap product` | `image-placeholder.svg` | Future Shop | _not added_ |
