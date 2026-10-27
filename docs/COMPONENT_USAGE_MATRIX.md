# Card and button usage matrix

**Status: planning matrix with homepage implementation audit appended.** This matrix guides implementation and remains subject to open product decisions in [REQUIREMENTS.md](REQUIREMENTS.md).

## Cards and grouped surfaces

| Page / section | Purpose and hierarchy | Surface / image / responsive behavior | Click and CTA | Data states |
|---|---|---|---|---|
| Home — hero | Brand promise; headline, supporting copy, appointment/watch actions | Wide photo with dark overlay; stack text/actions on narrow screens | Container not clickable; primary Book Appointment link, subtle story link | Static; image fallback |
| Home — service preview | Service name, short detail, starting price | Four compact outlined cards; shared sample image; grid reduces columns | Card not wholly clickable; each card links to `/services` | Skeleton/empty/failed service data |
| Home/About — barber preview/team | Barber identity, specialty, portrait | Image-led outlined cards; preserve face crop; responsive grid | Separate profile/book link if enabled | Skeleton/empty/failure |
| Public — testimonials | Quote, customer identity, rating | Compact horizontal outlined cards; stack/scroll by viewport | Informational, no card action | Empty/failure; rating also labeled numerically |
| About — story/metrics | Story copy and four business facts | Editorial text plus compact metric row; no decorative nested card | Story CTA is a link | Static content fallback |
| Services — catalog | Service, duration, price and booking path | Image-led service cards, four across desktop | Separate Book action; selection state clear | Loading/empty/error |
| Services — booking banner | Appointment prompt | Wide image-backed strip | One primary booking link | Static/image fallback |
| Gallery — grid | Show completed work | Mixed crop image tiles; responsive grid; preserve focus | Tile opens accessible detail only if implemented | Loading/empty/error |
| Pricing — packages | Compare plan name, price, included services | Three outlined panels; equal hierarchy, “Popular” badge on one | One primary choose/book link per package | Loading/empty/error |
| Booking — step panels | Guide service → barber → date/time → details → confirmation | Outlined groups; lists/calendar beside each other on desktop, stack on mobile | Selection controls are buttons/radios; submit is single primary action | Loading, no availability, field errors, submission success/failure |
| Shop — products | Product name, image, price | Image-led cards with consistent product crop | Add-to-cart is action button; no card-wide click | Loading/empty/error; out-of-stock if supported |
| Contact — contact/hours/map | Contact channels and hours beside form | Two-column outlined region; stacks on mobile | Contact values are links; form submit button | Submit/loading/success/error |
| Admin — KPI/chart/table regions | Business summary and operations | KPI tiles, chart panels, semantic data table; compact grid | Panels informational; separate View All links | Loading/empty/error; bounded/paginated table |
| Admin — recent customers/top services | Prioritized business data | Dense list/table rows rather than decorative cards | Links/buttons only for authorized next action | Loading/empty/error; pagination as needed |
| Admin — quick actions | Shortcuts for frequent authorized tasks | Compact icon tiles in one group | Buttons or links according to action type | Disabled while unavailable; permission-gated |
| Customer — upcoming appointment | Date, service, barber, location | Appointment card with date rail/photo; stack actions on narrow view | Separate reschedule link/action and destructive Cancel button | Empty appointment prompt; loading/error |
| Customer — loyalty/offers | Points/progress, offer, terms/expiry | Outlined info and offer rows | Claim/redeem only after policy defined; offer terms visible | Empty/expired/loading/error |
| Customer — history/recommended/favorite | Recent visits and relevant services/barber | Dense history table; image-led recommendations; barber profile card | Separate Book Again CTA | Empty/loading/error; history paginated |
| Admin/Super Admin — destructive confirmation | Confirm a material deletion or change | Accessible dialog, concise target and consequence | Cancel secondary; destructive action explicit; role-gated | Pending/success/failure; focus returns to trigger |

## Button variants and behavior

| Location/action | Variant and visual treatment | Busy/disabled and confirmation | Permission / keyboard |
|---|---|---|---|
| Header, hero, banners — Book Appointment | Primary: compact gold fill, dark text, rounded | Disable during navigation only where needed | Public link; native keyboard link semantics |
| Service/barber/package — Book/Choose | Primary for local conversion, gold fill | Disable when unavailable/selection invalid | Public/customer; focus visible |
| Filter/category pills | Secondary/selected pill; outline or muted fill | Disabled when no matching option | Buttons, selected state conveyed semantically |
| “View all”, “Our story”, footer links | Subtle text/outline | No loading unless request is triggered | Links for navigation, buttons for in-place action |
| Shop — Add to Cart | Secondary outline with gold accent | Prevent duplicate add while pending; unavailable disables | Customer/public; button announces result accessibly |
| Contact/booking form — Submit | One primary CTA per form | Pending disables duplicate submit; success/error feedback | Public/customer; associated field errors |
| Customer — Reschedule | Primary or secondary based on chosen flow | Disable while saving; preserve prior appointment on failure | Own appointment only |
| Customer — Cancel appointment | Destructive outline/text emphasis | Explicit confirmation; no action until confirmed; pending lock | Own appointment + policy; dialog keyboard/focus handling |
| Admin — create/edit/save | Primary for form completion; secondary for cancel/back | Pending lock, validation errors, save feedback | Admin permission enforced server-side |
| Admin — delete/revoke | Destructive | Confirmation required, explain irreversible effect | Permission enforced server-side and audited |
| Super Admin — role/system/maintenance action | Primary/secondary by task; destructive variant for disabling access | Confirm high-impact change; pending lock and audit result | `super_admin` permission enforced server-side |
| Dashboard — View All / reports | Subtle outline or text | No loading for navigation; request controls have pending state | Link for destination, button for state change |

## Audit checklist

At each page milestone, record actual component names and paths, variants used, keyboard and narrow-screen result, and unresolved reference mismatch here. Do not mark a page conformant until it has been rendered and visually reviewed.

### Homepage implementation audit — source reviewed; final mobile check pending

| Component | Source | Actual use / status |
|---|---|---|
| SiteHeader / MobileNavigation / BrandMark | `src/components/layout/SiteHeader.jsx`, `src/components/layout/MobileNavigation.jsx`, `src/components/ui/BrandMark.jsx` | Transparent hero overlay, shared root-aware destinations, active route, responsive functional mobile disclosure, and booking CTA. |
| HeroSection | `src/features/landing/sections/HeroSection.jsx` | Full-cover `banner1.png`, overlay, left aligned editorial copy and one preloaded image. |
| ServiceCard | `src/features/landing/components/ServiceCard.jsx` | Four outlined service summaries with reusable image source prop and link to `/services`. Shared card art is disclosed; prices and real service photos pending. |
| BarberCard | `src/features/landing/components/BarberCard.jsx` | Three role/focus cards with reusable image source prop and a visible shared-image disclosure; actual staff names/photos absent. |
| ReviewCarousel | `src/features/landing/components/ReviewCarousel.jsx` | Labeled sample entries; native horizontal scroll, touch, arrow-key navigation, previous/next, position controls, 4.6s autoplay; pauses on hover/focus/pointer and respects reduced motion. |
| ScrollReveal | `src/components/animations/ScrollReveal.jsx` | Intersection Observer reveal for content groups, fallback visible without JS/observer, reduced-motion bypass. |
| SiteFooter | `src/components/layout/SiteFooter.jsx` | Exploration, location, hours placeholder and appointment CTA. |
| Button / ButtonLink / Icon | `src/components/ui/Button.jsx`, `src/components/ui/ButtonLink.jsx`, `src/components/ui/Icon.jsx` | One shared link/action component and link wrapper; primary/outline buttons use slim animated theme-colored borders, while carousel arrows remain static controls. |

### Services route implementation audit — source reviewed; browser review pending

| Component | Source | Actual use / status |
|---|---|---|
| ServicesPage | `src/app/services/page.js` | Server-rendered route with local image banner, shared header/footer, service catalog, pending-information note, and shared review section. |
| ServiceCatalog | `src/features/services/components/ServiceCatalog.jsx` | Client-side category filters over illustrative service data; reuses `ServiceCard` and omits unavailable booking actions. |
| ServiceCard | `src/features/landing/components/ServiceCard.jsx` | Reused for the route catalog with `actionHref={null}`. Reused sample image is disclosed; prices/menu confirmation remain pending. |

The route follows the supplied Services reference's photo hero, category filters, card grid, appointment-information area, reviews, and footer. Exact service copy/prices are not verified. Browser and responsive visual review remain pending.

### Booking route implementation audit — source and HTTP response checked; visual review pending

| Component | Source | Actual use / status |
|---|---|---|
| BookingPage | `src/app/booking/page.js` | Server-rendered composition using shared header/footer, compact text intro, progress, booking form, shared reviews. |
| BookingProgress | `src/features/booking/components/BookingProgress.jsx` | Accessible static five-step pill row between the intro and booking controls. |
| DatePreferencePicker | `src/features/booking/components/DatePreferencePicker.jsx` | Navigable calendar and time input for preferences only; does not indicate availability. |
| BookingForm | `src/features/booking/components/BookingForm.jsx` | Three compact selection columns followed by customer details beside the live summary. Submit displays a preview-only disclosure; it makes no request and stores nothing. |

The route returns HTTP 200 and the static HTML includes its pill progress row, selection steps, calendar controls, and preview disclosure. No real barber roster, availability, booking policy, API, database, or auth is available. Desktop/mobile rendering has not been visually reviewed; use the manual checklist in `NEXT_TASK.md`.

Visual conformance is **partial**: desktop and an initial mobile view were reviewed; the mobile view found overflow, then the heading/header CSS was adjusted. Automatic approval review rejected the final recapture, so the fix is not visually reconfirmed. Section order and tokens follow the reference, hero/team backgrounds use supplied local images, but service/barber photography, prices, staff details and approved reviews are absent. Booking is a preview-only form and has not been visually reviewed. The home page omits the extra closing CTA section that was not present in the reference.
