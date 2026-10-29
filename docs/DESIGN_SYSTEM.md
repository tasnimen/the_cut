# The Cut design system

**Status: Phase C shared foundations are implemented in `src/styles/tokens.css`, `src/app/globals.css`, `src/components/ui/`, `src/components/layout/`, `src/components/motion/`, and `src/lib/motion/`.** The public montage remains the page-specific visual reference. Values are the implementation palette, not sampled source-file tokens from the image.

## Visual principles

- Near-black blue/teal surfaces, thin cool borders, warm cream text, and restrained gold accents.
- Editorial serif headings paired with compact sans-serif body/navigation text.
- Cinematic, edge-to-edge salon images where a page reference calls for a banner, with a dark overlay that protects text contrast.
- Restrained glass panels, stepped depth shadows, gradient borders, and pointer tilt on selected surfaces. Keep blur layers limited to foreground panels; prefer solid surfaces for dense cards.
- Reuse layout and interaction primitives while retaining each route's specific reference hierarchy.

## Implemented tokens

| Token | CSS value | Use |
|---|---|---|
| `--background` | `#041018` | Page canvas |
| `--surface` | `#071923` | Cards and primary panels |
| `--surface-raised` | `#0a2029` | Hovered card surface |
| `--border` | `#174452` | Main outlines |
| `--border-soft` | `#10333f` | Dividers and secondary outlines |
| `--text` | `#f2e8d9` | Main text/headings |
| `--muted` | `#9daeb0` | Supporting text |
| `--gold` | `#dba663` | Main action and active accent |
| `--gold-light` | `#f0c487` | Hover, focus, and highlighted text |

All recurring CSS colors now use named custom properties in `src/styles/tokens.css`; Tailwind v4 exposes the shared surface, border, text, gold, and font aliases through `@theme inline`. The original palette values are preserved and consolidated, not derived from pixel sampling.

## Phase C shared recipes

- `Surface` uses `cva` variants for solid or `glass-sm`, `glass-md`, and `glass-lg`, plus flat/raised/floating depth and an optional interactive lift. Unsupported backdrop-filter browsers receive an opaque solid surface. Glass variants use a 1px gradient border and inset highlight; blur steps are 10px, 16px, and 22px.
- Depth levels use the named `--depth-shadow-*` tokens. `TiltSurface` applies pointer-driven GPU transforms capped at 4 degrees, resets on pointer exit, and disables transforms under reduced motion. Use tilt selectively; do not stack it on every card.
- `Button` variants are composed through `class-variance-authority`; `cn()` combines `clsx` and `tailwind-merge` for shared variant composition.
- `SiteFrame`, `PageContainer`, and `PageSection` are layout shells. Existing routes now share `SiteFrame` while retaining their header mode, route state, main ID, sections, and footer.
- `MotionReveal` uses the shared `src/lib/motion/config.js` variants and honors reduced-motion preferences. Existing `ScrollReveal` remains available for Intersection Observer reveals.
- `SmoothScrollProvider` dynamically loads Lenis, GSAP, and ScrollTrigger after idle, synchronizes Lenis to the GSAP ticker, and skips setup under reduced motion.
- Home hero gold dust is the only R3F element. Its canvas is dynamically imported with SSR disabled, loads after idle and when in view, uses a CSS-token color, and falls back to a static low-power/reduced-motion treatment.
- `/design-system` is registered as `development-only`, excluded from navigation, and calls Next `notFound()` outside development. It is a component preview, not an admin or public marketing route.
- `/sign-in` and `/sign-up` use the shared `AuthPanel` client form inside the flow header/footer shell. The form surface uses named palette, border, and depth tokens; labels, focus rings, pending/error/status states, and touch-size inputs follow shared control patterns. Auth pages are noindex and only submit to same-origin Better Auth endpoints.

## Typography

- Display: Cormorant Garamond, then Georgia/Times serif fallbacks, loaded through `next/font/google`.
- Body/UI: Manrope, then Arial/Helvetica sans fallbacks, loaded through `next/font/google`.
- Body default is 14px with 1.6 line height. Navigation, eyebrow, and card labels use smaller CSS-defined sizes.
- Both families are subset to Latin and use `display: swap`; Next self-hosts the font assets at build time. The families are a design choice, not verified identification from the montage.

## Layout and responsive behavior

- Shared shell: max 1220px, with 64px total viewport inset by default.
- At 980px and below: shell max 760px with a 44px viewport inset; tablet section grids reduce columns.
- At 760px and below: header switches to the mobile disclosure menu; service/review grids reduce columns.
- At 560px and below: 36px total shell inset, single-card review width, and compact section spacing.
- Implemented media breakpoints are 980px, 760px, and 560px. Mobile layouts stack section headings, reduce card columns, and retain touch-sized controls.
- The shared marketing header is transparent and positioned over the banner. Booking opts into the `flow` variant so the header reserves vertical space before the compact intro. A small active-link underline remains on desktop navigation.
- Header links and footer links use route-aware root paths so they work from `/services` as well as `/`.

## Buttons and focus

- `Button` supports either an `href` link or a semantic button action. `ButtonLink` is a convenience wrapper for links.
- Primary actions use a gold fill; outline/card variants use dark surfaces and gold/cream text. CTA borders use a 1px conic gold/teal gradient that travels on a 7-second CSS cycle; no layout dimensions change during animation.
- Carousel arrows and the mobile menu toggle use static icon-control styling. Do not animate destructive or tiny utility controls by default.
- Standard CTA height is 44px; compact CTA height is 40px; card links are 38px. The rounded action radius is 999px. Focus-visible uses a 2px light-gold outline offset by 4px.
- The button border animation and smooth page scrolling stop under `prefers-reduced-motion: reduce`.

## Cards and imagery

- `ServiceCard` and `BarberCard` are feature-specific reusable patterns; there is no generic catch-all card component. They accept configurable local image source and alt text. Service cards may omit their action when its destination is not available.
- `CardImage` uses `next/image` with a positioned ratio-controlled container, `fill`, `sizes`, and `object-fit: cover`.
- Service card source ratio is approximately 1.62:1; barber card ratio approximately 0.88:1; review avatar is square and clipped circularly.
- `/images/banner1.png` is the homepage hero; `/images/banner2.png` supports the team panel and Services hero. Each banner is a local `next/image` fill with responsive sizes; above-the-fold banners are preloaded.
- `/images/card-image.webp` (800×800) is currently repeated in service, barber, and sample review cards because the user requested this existing asset. It contains a visible Dreamstime watermark and is not distinct service/staff/customer photography. Reuse is disclosed in the UI; replace it with approved fitting images before cards are represented as real people or work.
- No remote image patterns are configured. PNG transfer sizes and deployed optimizer output have not been measured.

## Scroll and carousel behavior

- `ScrollReveal` is a small Intersection Observer client component. It reveals section/card groups with a 480ms transition and 420ms staggered child transition (55ms offsets for early cards). Content remains visible if JavaScript/Intersection Observer is unavailable; reduced motion reveals immediately.
- `ReviewCarousel` is specific to testimonial presentation. It uses native horizontal scrolling/snap, touch, keyboard arrows, previous/next controls, position buttons, and a 4.6-second auto-advance. Hover/focus/pointer pauses the timer; reduced motion disables autoplay. It loops by returning to the first item without cloned slides and handles empty/single lists.
- The service category filter is a small client component with `aria-pressed` buttons; service records remain in the shared data module.
- Booking layout fixes were reviewed with Playwright at 1440px, 768px, and 375px; see [Progress](PROGRESS.md) for actual results. Other routes have not received a full responsive/accessibility review.

Phase C adds the shared smooth-scroll runtime and the single deferred hero particle canvas described above. Keep motion to transform/opacity, pause visual work when off-screen, and preserve CSS or static fallbacks.

## Route-specific reference direction

The supplied montage depicts Home, About, Services, Gallery, Pricing, Booking, Shop, and Contact. Home, About, Services, Gallery, Pricing, Contact preview, and Booking preview have route implementations. Shop and dashboards remain planned. About/Gallery/Pricing/Contact use their own editorial and photo-led compositions; unknown shop facts and unavailable work photography are disclosed rather than invented.

The Services reference uses a photo-led hero, category pills, four service cards per row, an appointment prompt, reviews, and footer. The current route follows that structure but marks service/menu content as illustrative and omits unavailable prices/booking actions rather than fabricating business facts.

The current Booking reference uses a compact text introduction, pill-like progress row, three selection columns for service, barber, and date/time, a lower details-and-summary row, reviews, and footer. `/booking` follows that hierarchy with a preference-only calendar/time field and one no-preference barber option. No booking is sent or confirmed because the backend and business rules are missing. See [the booking audit](BOOKING_PAGE_AUDIT.md).

## Data and states

- Current service/menu descriptions and review copy are illustrative; prices and authentic testimonials are not available.
- Staff profiles, business hours, and contact details have not been verified. Do not turn placeholders into claims.
- Home and Services pages are statically rendered from local data; they do not currently fetch API data and therefore have no API loading/error state. Add explicit loading, empty, and error states when an authoritative backend is introduced.
- `/booking` is a preview-only form. No page should claim that an appointment has been saved.

## Stage 3 — Home page alignment (2026-10-29)

Compared against `docs/design/The Cut_ Luxury Barbershop Website Collection.png` (home panel), production build at 1440 px.

| Item | Before | After |
|---|---|---|
| Hero headline | Lowercase serif "More than a / haircut." with gold italic | Small tracked "MORE THAN A" over large uppercase "HAIRCUT" (`.hero h1`, `.hero-title-lead`) |
| Hero secondary link | "Explore our services" | "Our story" (`ROUTES.story`); the mockup's "Watch Our Story" needs a video that does not exist |
| Services heading | "The good stuff / Care for your kind of style." | "Our services." with "View all services →" link; the sample-image disclosure moved to `.section-footnote` |
| Service cards | 4 columns with 6 cards (orphan row), "Explore services" to /services | `.service-grid` is 3 columns (6 cards = 2 full rows); button "Book Now" to /booking |
| Toasts | n/a | `sonner/dist/styles.css` is imported by `AppToaster` because CSP (`style-src` nonce) blocks sonner's runtime `<style>` injection; the console still logs two blocked-inline-style notices, harmless |

Open for the home page: barber section layout (mockup: four photo cards with names and roles under "Meet Our Expert Barbers"), reviews heading and aggregate rating ("What Our Clients Say", figures not supplied), footer newsletter and social icons, nav search icon and Shop link (Shop not built), and per-service photos (only the shared `card-image` exists). Not screenshot-compared at 768 and 375 px in this unit.

## Decoration pass (2026-10-29, U2b part 2)

Tokens added in `src/styles/tokens.css`: `--gold-line` (fading gold divider), `--glow-gold`, `--grain-image` (SVG noise). All motion is transform or opacity only and is disabled under `prefers-reduced-motion`.

| Element | Treatment |
|---|---|
| Section headings (`.section-heading`, `.marketing-section-heading`) | 1 px gold divider underneath (`::after`, `--gold-line`) |
| Service, barber and pricing cards | Soft gold glow and warm border on hover/focus via a `::after` layer whose opacity animates (no box-shadow animation); existing 1.035 image zoom kept for service, barber and gallery images |
| Grain | `body::before`, fixed, 3.5% opacity, `pointer-events: none` |
| CTA band | New `CtaBanner` (slot `cta-background`) on home and services; copy has no offers or discounts |
| Footer | Slot `footer-backdrop` at 10% opacity behind the footer content |
| `offer-banner` slot | Defined but not rendered: no real offer exists |

Verified on a production build at 1440, 768 and 375 px: no horizontal overflow, grain does not block clicks, CTA button 44 px tall at 375 px. Barber cards use the neutral placeholder (not the watermarked sample) until real portraits exist.

## Services page alignment (2026-10-29)

Compared with the services panel of `docs/design/The Cut_ Luxury Barbershop Website Collection.png`.

| Item | Before | After |
|---|---|---|
| Category tabs | All services, Hair, Beard, Shave | All Services, Haircut, Beard, Shave, Color, Treatment (mockup order); `category` values in `config/booking-services.js` updated (Combo sits under Haircut) |
| Hero copy | "Considered cuts and grooming, shaped around the person in the chair." | "Premium grooming services designed to keep you looking sharp, confident, and fresh." |
| Disclaimers | "Illustrative services", "final menu and prices pending", "booking flow still being prepared" | Removed; one line "Prices are in USD, before tax. Payment is at the shop." and a booking-flow sentence that matches reality; the shared-sample-image note stays (honest) |
| Metadata | "illustrative ... being confirmed" | Real description |

Still different from the mockup: per-service photos and the barber-washing hero photo (no photos yet; slots `service-*` and `hero-services`), 4-card row (we have 6 services, 3 columns), and the "Book Your Appointment" offer banner (replaced by an offer-free CTA band). Checked on a production build: tabs filter correctly (Haircut: Haircut + Combo; Color; Treatment; Beard; Shave), 375 px has no overflow and 44 px tabs.
