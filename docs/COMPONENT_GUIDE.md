# Component guide

This guide describes existing components and when to reuse them. Keep page files as composition layers, static content in data modules, and browser interaction in small Client Components.

## Shared site components

Site routes, section anchors, site metadata, navigation links, role permissions, and validated environment values live under `src/config/`. `src/styles/tokens.css` is the CSS/Tailwind theme source.

| Component | Source | Boundary | Intended use |
|---|---|---|---|
| `SiteHeader` | `src/components/layout/SiteHeader.jsx` | Server Component | Transparent hero overlay by default; `variant="flow"` reserves vertical space before a page intro. Accepts `activePath`; desktop and mobile navigation share `siteNavigation`. |
| `MobileNavigation` | `src/components/layout/MobileNavigation.jsx` | Client Component | Small-screen menu disclosure. Handles Escape, outside pointer, link selection, resize reset, focus restoration, and listener cleanup. |
| `SiteFooter` | `src/components/layout/SiteFooter.jsx` | Server Component | Reusable footer with root-qualified links. Unknown contact/hours remain disclosed. |
| `BrandMark` | `src/components/ui/BrandMark.jsx` | Server Component | Reusable wordmark. |
| `SiteFrame` | `src/components/layout/SiteFrame.jsx` | Server Component | Shared header/main/footer shell; supports active route, header variant, main ID, and main classes. |
| `PageContainer` | `src/components/layout/PageContainer.jsx` | Server Component | Constrains content to the shared page width; use `as` for a semantic element. |
| `PageSection` | `src/components/layout/PageSection.jsx` | Server Component | Semantic section shell with standard, compact, or spacious spacing variants. |

## UI primitives

| Component | Source | Props/behavior |
|---|---|---|
| `Button` | `src/components/ui/Button.jsx` | Use `href` for a navigation link; omit it for a semantic button action. Supports `variant`, `size`, `icon`, `className`, and native link/button props. Default icon is the small up-right arrow; pass `icon={null}` to omit. |
| `ButtonLink` | `src/components/ui/ButtonLink.jsx` | Convenience link wrapper around `Button`, with `href`, `variant`, `size`, and `className`. |
| `CardImage` | `src/components/ui/CardImage.jsx` | `src`, `alt`, `className`, and responsive `sizes`. Requires a CSS-sized positioned container; uses Next Image `fill` and cover crop. |
| `SectionHeading` | `src/components/ui/SectionHeading.jsx` | Shared eyebrow/title/optional aside layout; title content is supplied as children. |
| `Icon` | `src/components/ui/Icon.jsx` | Local inline SVG map. Add only icons used by the site. Gravity UI packages are not installed in this project. |
| `Surface` | `src/components/ui/Surface.jsx` | `glass`, `depth`, `interactive`, `as`, and native element props. Solid fallback if backdrop blur is unavailable. |
| `TiltSurface` | `src/components/ui/TiltSurface.jsx` | Client Component | Pointer tilt wrapper for selected desktop cards; capped at 4 degrees and reset on pointer exit. Honors CSS reduced-motion override. |

## Motion and depth

| Component/module | Source | Usage |
|---|---|---|
| `SmoothScrollProvider` | `src/components/motion/SmoothScrollProvider.jsx` | Root provider dynamically imports Lenis + GSAP + ScrollTrigger after idle and connects them to one ticker. Skips reduced-motion users. |
| `MotionReveal` | `src/components/motion/MotionReveal.jsx` | Motion-based in-view reveal for selected content groups. Uses shared variants and `prefers-reduced-motion`. |
| Motion settings | `src/lib/motion/config.js` | Shared durations, easing curves, and reveal variants. Keep new animation timing here or in named CSS tokens. |
| `HeroDepth` | `src/components/three/HeroDepth.jsx` | Deferred hero decoration. Loads a low-cost R3F gold dust field only when in view, idle, and not reduced-motion/low-power. |

The `/design-system` route previews buttons, solid/glass surfaces, depth, tilt, and reveal behavior in development. It is absent from the public navigation and returns `notFound()` in other environments.

## Landing feature components

| Component | Source | Usage |
|---|---|---|
| `ServiceCard` | `src/features/landing/components/ServiceCard.jsx` | Service content plus configurable `imageSrc`, `imageAlt`, `actionHref`, and `actionLabel`. Pass `actionHref={null}` to omit a CTA whose destination is not implemented. |
| `BarberCard` | `src/features/landing/components/BarberCard.jsx` | Barber role/focus plus configurable image source and alt text. Current identities are intentionally not supplied. |
| `ReviewCarousel` | `src/features/landing/components/ReviewCarousel.jsx` | Carousel for review-shaped content only. Accepts `reviews` and `imageSrc`; includes autoplay and interaction/reduced-motion behavior. Content defaults to sample data. |
| `ScrollReveal` | `src/components/animations/ScrollReveal.jsx` | Wrap a meaningful content group. Supports `as`, `className`, and `stagger`; do not wrap every text line separately. |

## Services route

| Component | Source | Usage |
|---|---|---|
| `ServiceCatalog` | `src/features/services/components/ServiceCatalog.jsx` | Client-side category filter over the shared illustrative service data. Uses `ServiceCard` without a booking CTA because the booking backend and verified menu are not available. |

## Marketing preview routes

| Component/module | Source | Usage |
|---|---|---|
| `MarketingPageHero` | `src/features/marketing/components/MarketingPageHero.jsx` | Shared photo-led title area for About, Gallery, Pricing, and Contact. Uses local concept imagery and keeps descriptive copy in the route composition. |
| `GalleryGrid` | `src/features/marketing/components/GalleryGrid.jsx` | Client-side category filter and native dialog lightbox. Only concept imagery is present; do not describe it as verified client work. |
| Gallery items | `src/features/marketing/data/gallery.js` | Small illustrative image list. Replace with approved, rights-cleared shop/staff/client photos before presenting a real portfolio. |

About and Pricing are server-rendered editorial routes. Contact is a server-rendered information preview; it does not send or store messages. All four pages disclose unknown business facts rather than inventing them.

## Booking route

| Component | Source | Usage |
|---|---|---|
| `BookingPage` | `src/app/booking/page.js` | Server-rendered route composition with shared header, compact text intro, booking form, reviews, and footer. |
| `BookingProgress` | `src/features/booking/components/BookingProgress.jsx` | Static accessible five-step progress rail matching the supplied Booking composition. |
| `DatePreferencePicker` | `src/features/booking/components/DatePreferencePicker.jsx` | Accessible month grid for choosing a preferred date plus a time input. It indicates the visitor's selection only; it has no business availability data. |
| `BookingForm` | `src/features/booking/components/BookingForm.jsx` | Client-side preview only. Places compact service/barber/date-time choices in three columns and details beside the live summary. Submit never transmits or persists details; replace this behavior only after an authoritative API and booking rules are available. |

## Data and composition

- Home composition: `src/app/page.js`; section components and data are under `src/features/landing/`.
- Services route composition: `src/app/services/page.js`; catalog interaction is under `src/features/services/`.
- Shared site data, route/anchor registry, navigation, permissions, and server environment schema: `src/config/`.
- Shared navigation labels/paths: `src/config/navigation.js`; URL/access entries: `src/config/routes.js`.
- Shared illustrative service data: `src/features/landing/data/services.js`.
- Shared image source: `src/features/landing/data/cardImage.js`.
- Sample review data: `src/features/landing/data/reviews.js`.

Use Server Components unless state or browser APIs are necessary. Do not introduce TypeScript or another icon/animation library for these patterns.
