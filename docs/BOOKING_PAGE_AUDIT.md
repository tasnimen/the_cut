# Booking page visual difference audit

## Phase G implementation update (2026-10-28; prices updated 2026-10-29)

- The former preview-only form is now backed by availability and booking Route Handlers. It renders active service prices from the server, Eastern-time slots, barber choices and customer account identity. Phone remains optional; SMS consent is separate and unchecked. Confirm is disabled unless the selected services have configured prices.
- Create, cancel, reschedule, list-own, and admin no-show operations use Better Auth authorization and MongoDB transactions. Unique quarter-hour occupancy documents include each service's rounded duration plus the cleanup buffer. Any barber selection favors the eligible barber with the fewest bookings that day and breaks ties by name.
- Approved prices/durations are in the shared catalog: Haircut $25/30m, Beard Trim $15/20m, Shave $20/30m, Hair Color $60/60m, Hair Treatment $40/45m, and Combo $35/45m. Booking uses database values, rejects invalid prices, and stores historical snapshots. Confirmation remains blocked until the uninspected `the_cut` service rows are safely reconciled and seeded. The seed was not run.
- Rules are in `src/config/booking.js`; assumptions and default roster/schedule caveats are in `docs/AI_HANDOFF.md`. Production needs a transaction-capable Atlas deployment and confirmed barber schedules. No live booking or browser test was run after this backend/UI update.
- Current checks: tests 215/215 across 14 files; lint zero errors with one existing `HeroSection.jsx` warning; `npm.cmd run build` passed and compiled all booking routes.

**Updated:** 2026-10-27  
**Reference inspected:** the booking screenshot embedded with the latest user request. The original image binary is not available in the project or its pasted-text attachment folder.  
**Comparison limit:** The original reference image binary is unavailable. A browser review was later completed against the implementation at 1440px, 768px, and 375px; this confirms rendered behavior at those widths but does not establish pixel-perfect conformance with the unavailable source image.

| Element | Reference appearance | Current implementation before this correction (source review) | Specific mismatch | Required correction |
|---|---|---|---|---|
| Page opening/header | Compact text-led “Book Appointment / Schedule Your Visit” intro at the top of the dark page, under the shared navbar | `booking-hero` is a 300px photo banner using `banner1.png`, with larger centered-height hero composition | Photo banner and its height dominate the first viewport; the reference moves quickly from heading to the workflow | Remove the large image banner; use a compact left-aligned text intro with shared transparent header |
| Section hierarchy | Intro → compact horizontal pill stepper → three booking columns → details/summary row → reviews → footer | Extra “Plan your visit / Your time, your chair” SectionHeading precedes a numbered rail; step rail sits outside the form | Redundant heading and rail consume vertical space and do not match the reference’s compact step control | Remove the extra heading; render the five steps as a compact pill-like progress row directly above the controls |
| Service selection | Dense vertical service rows with small image/mark, service title and price, in the first column | Four bordered service option cards with explanatory copy and no pricing | Cards are taller and visually heavier; they lack the reference’s compact list rhythm and price alignment | Use compact selectable rows. Do not invent prices; mark menu/prices as examples or pending. Avoid the watermarked stock image as fake service photography |
| Barber selection | Vertical roster rows with portraits, names, specialties and radio selection | A single “No preference” radio and explanatory paragraph | The visual roster cannot be reproduced truthfully: no verified barber identities/photos exist | Keep one honest no-preference choice and a concise roster-pending note; do not fabricate names or portraits |
| Date/time | Visible month calendar with selected date and time choices in the third column | Native date and time fields stacked in a plain panel | No visible calendar grid; the panel has less visual structure. The reference time buttons imply actual availability that is not implemented | Add an accessible month calendar for choosing a preferred date and retain a time input. State clearly that these are preferences and availability is not checked; don't label any slots available |
| Main booking area | Three similarly weighted outlined panels across the page; compact details and summary panels beneath | Three panels exist, but the date/time panel has stacked inputs and all panels inherit a generic form-card treatment | Content density and control hierarchy differ from the reference | Use compact list rows, calendar grid and restrained dark panel borders; preserve the 3-column relationship |
| Details/summary | Step 4 customer fields beside step 5 summary; prominent final request action in the summary | Customer details panel beside summary; submit action belongs to details panel | CTA placement differs; current summary includes only a subset of customer details | Keep fields in step 4 and put the truthful “Review Request” action in the summary area; show selected service/date/time/name without fake prices or confirmation |
| Reviews/footer | Three compact review cards and shared footer close the page | Shared reviews carousel and footer already follow the form | Section order is aligned; review component’s exact density has not been browser-compared | Retain shared reviews/footer and source-review their spacing after form changes |
| Imagery | Small service/barber thumbnail imagery appears in the reference rows | Only `banner1.png`, `banner2.png`, and visibly watermarked `card-image.webp` exist | The only square card image is stock-watermarked and cannot truthfully represent actual services or staff | Do not use it as a fabricated roster. Keep rows typographic until approved role-appropriate photos are supplied |
| Responsive behavior | Reference is desktop-oriented; mobile adaptation must retain the order and selection hierarchy | Existing CSS stacks columns below 760px and compresses the progress labels | Mobile layout has not been rendered or visually checked | Keep progress horizontally scrollable/compact and stack the three panels then details/summary without overflow; perform manual viewport review |

## Corrections made for this iteration

- Replaced the tall photo hero and extra section heading with the reference's compact text-led intro.
- Changed the progress rail to pill-like steps immediately above the booking controls.
- Reorganized the first row around a compact service list, honest barber preference, and navigable date calendar/time preference.
- Moved the truthful review-request action into the summary panel.
- Preserved native form validation and the no-send/no-save notice. No backend is present, so no appointment success state or availability is shown.
- Used Next.js `connection()` inside a streamed `Suspense` boundary to provide the current local date to the calendar without reading wall-clock time during prerender. The production response contains the calendar grid.

## Verification and unresolved reference details

- The inline screenshot was available for visual inspection; its original file was not available to open or measure. Text labels, small portraits, prices, date/month and exact dimensions are not authoritative enough to copy.
- `npm.cmd run lint` and `npm.cmd run build` passed after these changes. The build reports `/booking` as partially prerendered with dynamic server-streamed content.
- Production HTTP checks returned 200 for `/`, `/services`, and `/booking`; booking HTML includes the compact intro, three step labels, calendar grid, preview disclosure, and review action.
- Browser review captures are `booking-1440.png`, `booking-768.png`, and `booking-375.png`. The intro overlaps the shared header at each width; several labels/calendar/helper texts appear around 8px; at 768px details and summary stay side-by-side and the summary is cramped. No horizontal overflow or console errors were observed. Widths 390px and 320px remain unchecked. Do not report visual conformance.
- Final menu/prices, barber roster, opening hours/timezone, availability rules, booking API/database, and Better Auth integration remain unprovided. The date calendar selects preferences only; it must not imply available slots.

## Browser review findings (2026-10-27)

- The review used the running development server on port 3000 because starting a second Next dev server on port 3010 failed with an existing-server lock.
- Form checks confirmed the summary updates for service, date/time preference, and name. Past dates are disabled; malformed email is invalid; barber selection is limited to “No preference.” A valid sample submission showed the no-send/no-save notice and made no booking request. Footer appointment navigation resolved to `/booking`; no console errors were reported.
- Visual corrections identified then: move the intro below the shared header, raise undersized copy/labels/calendar text to readable sizes, and stack or otherwise provide adequate width for the details and summary at 768px. These were addressed and rechecked in Phase B below.

## Phase B corrections and recheck (2026-10-27)

- Booking uses the shared `SiteHeader` `flow` variant, which reserves its own height before the compact intro and removes the overlap.
- Booking labels, panel notes, calendar text, and summary copy were increased. At 375px the compact progress labels remain 9px to fit the five-step row; the smallest other measured booking text is 11px.
- The details and summary panels remain side-by-side at desktop and stack below 980px, including the 768px tablet width.
- Playwright/Chrome checked `http://localhost:3000/booking` at 1440px, 768px, and 375px. Header bottom/intro top were 78/78, 73/73, and 68/68px respectively. Details-grid columns were 2, 1, and 1. All widths had no horizontal overflow and no browser console/page errors.
- New full-page captures are in the ignored `.next/phase-b-booking-1440.png`, `.next/phase-b-booking-768.png`, and `.next/phase-b-booking-375.png` build directory. Existing root captures were not overwritten.
