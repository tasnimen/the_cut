# The Cut design system

**Status: canonical source is the current homepage and shared CSS.** The public montage remains the page-specific visual reference. Values below describe the implementation in `src/app/globals.css`; they are not claims that a browser comparison has been completed. The supplied composites do not provide source design tokens or exact typography.

## Visual principles

- Near-black blue/teal surfaces, thin cool borders, warm cream text, and restrained gold accents.
- Editorial serif headings paired with compact sans-serif body/navigation text.
- Cinematic, edge-to-edge salon images where a page reference calls for a banner, with a dark overlay that protects text contrast.
- Outlined cards and modest borders rather than heavy elevation, large shadows, or glass effects.
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

The active stylesheet is authoritative. Some image overlays and state-specific borders use nearby inline rgba/hex values; no exact source palette was supplied.

## Typography

- Display: `Georgia`, then `Times New Roman`, then serif fallback.
- Body/UI: `Arial`, then `Helvetica`, then sans-serif fallback.
- Body default is 14px with 1.6 line height. Navigation, eyebrow, and card labels use smaller CSS-defined sizes.
- These are system stacks, not the exact families in the montage. No licensed local font files are present; the pairing is provisional.

## Layout and responsive behavior

- Shared shell: max 1220px, with 64px total viewport inset by default.
- At 980px and below: shell max 760px with a 44px viewport inset; tablet section grids reduce columns.
- At 760px and below: header switches to the mobile disclosure menu; service/review grids reduce columns.
- At 560px and below: 36px total shell inset, single-card review width, and compact section spacing.
- Implemented media breakpoints are 980px, 760px, and 560px. Mobile layouts stack section headings, reduce card columns, and retain touch-sized controls.
- The header is transparent and positioned over the banner. It has no bottom border/background panel. A small active-link underline remains on the desktop navigation.
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
- Browser interaction and responsive visual checks remain outstanding; see [Progress](PROGRESS.md).

## Route-specific reference direction

The supplied montage depicts Home, About, Services, Gallery, Pricing, Booking, Shop, and Contact. Home, Services, and Booking have route implementations. About, Gallery, Pricing, Shop, dashboards, and Contact routes remain planned. Their own reference compositions take precedence over copying the homepage layout; share tokens/components where the interaction and content pattern matches.

The Services reference uses a photo-led hero, category pills, four service cards per row, an appointment prompt, reviews, and footer. The current route follows that structure but marks service/menu content as illustrative and omits unavailable prices/booking actions rather than fabricating business facts.

The current Booking reference uses a compact text introduction, pill-like progress row, three selection columns for service, barber, and date/time, a lower details-and-summary row, reviews, and footer. `/booking` follows that hierarchy with a preference-only calendar/time field and one no-preference barber option. No booking is sent or confirmed because the backend and business rules are missing. See [the booking audit](BOOKING_PAGE_AUDIT.md).

## Data and states

- Current service/menu descriptions and review copy are illustrative; prices and authentic testimonials are not available.
- Staff profiles, business hours, and contact details have not been verified. Do not turn placeholders into claims.
- Home and Services pages are statically rendered from local data; they do not currently fetch API data and therefore have no API loading/error state. Add explicit loading, empty, and error states when an authoritative backend is introduced.
- `/booking` is a preview-only form. No page should claim that an appointment has been saved.
