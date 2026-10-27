# Progress

**Current phase: shared UI and public routes.** Updated 2026-10-27.

## Completed

- Initial planning and reference audit are documented in requirements, architecture, permissions, security, data, design, and implementation-roadmap docs.
- Home (`/`) is implemented as modular sections with shared transparent responsive navigation, hero, service/barber previews, sample review carousel, and footer.
- Services (`/services`) is implemented as a Server Component route using its own photo-led hero, functional client-side service-category filters, shared cards/reviews/footer, and an honest illustrative-menu disclosure.
- Shared navigation/footer destinations are root-qualified so they work from both routes; active route state is passed into the header.
- Homepage service-card actions now lead to the implemented `/services` route instead of the pending booking route.
- The final homepage design is documented in `docs/DESIGN_SYSTEM.md`; reusable component usage and boundaries are described in the new `docs/COMPONENT_GUIDE.md`.
- Service data is visibly disclosed as illustrative; unknown prices, booking behavior, staff details, and reviews are not presented as verified facts.
- Better Auth remains mandatory for the future auth phase; it is not installed or implemented.
- Booking (`/booking`) now follows the latest supplied screenshot hierarchy: compact text intro, pill-like step row, three selection columns (service list, no-preference barber, preference calendar/time), then customer details beside a live summary, reviews, and footer. It remains a responsive client-side preview; submission explicitly says nothing was sent or saved. See `docs/BOOKING_PAGE_AUDIT.md`.
- No verified barber roster, availability rules, booking API, Express server, database connection, or authentication integration exists. The booking form is not a reservation and must not be presented as one.

## Current checks

- `npm.cmd run lint` — passed after the latest Booking reference correction.
- `npm.cmd run build` — passed; `/`, `/services`, `/booking`, and `/_not-found` were generated. `/booking` is partially prerendered with its current-date calendar streamed at request time.
- Production route smoke check — `/`, `/services`, and `/booking` returned HTTP 200. Booking HTML contained the compact intro, three selection-step labels, calendar grid, preview disclosure, and review action.
- Browser review is complete at 1440px, 768px, and 375px. Captures are `booking-1440.png`, `booking-768.png`, and `booking-375.png`. Defects: the intro overlaps the shared header at all widths; several labels/calendar/helper texts are around 8px; details and summary remain side-by-side at 768px, leaving the summary cramped. No horizontal overflow or console errors were observed. Preview interaction and no-request submission checks passed. Widths 390px and 320px remain unchecked; see `docs/BOOKING_PAGE_AUDIT.md`.
- No test script exists in `package.json`; no test files/dependencies were added.
- Booking submission is not connected to a backend; no customer details are transmitted or persisted.
- The booking page was corrected again to remove the unnecessary photo hero and extra heading, add a preference calendar, and place the review-request CTA in the summary. Browser review now confirms the rendered page has the defects listed above; visual conformance is not achieved.

## Remaining limits

- The user-requested card image is one visibly watermarked scissors image reused across service, barber, and review cards; replace it with approved appropriate photos before representing the cards as real content.
- Current service copy is explicitly illustrative; final service list and prices are not supplied.
- About, Barbers, Gallery, Pricing, Shop, Contact, customer/admin dashboards, API, database, and Better Auth remain unimplemented. Booking is only a disclosed interface preview.
- Before enabling real booking, settle the business rules and implement the authoritative Express/MongoDB API, availability/concurrency validation, and required Better Auth/authorization integration.
- No verified staff identities, authentic reviews, business hours, or contact channels are available.

## Exact next task

Correct the documented Booking intro/header overlap, undersized text, and cramped 768px details/summary layout; recheck at 1440, 768, 390, and 320px. Then obtain verified policy inputs (service names/prices/durations, barber roster, opening hours/timezone, availability, cancellation, and sign-in requirement) before building the authoritative Express/MongoDB API and Better Auth authorization. Do not infer missing policy or show success before persistence succeeds.
