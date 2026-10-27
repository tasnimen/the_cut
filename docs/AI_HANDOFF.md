# AI handoff

**Updated:** 2026-10-27

## Current state

- **Phase A code audit completed on 2026-10-27** in `docs/AUDIT.md`; this task changed documentation only. The report records severity, evidence, exact fixes, route/access inventory, security gate status, and keep/refactor decisions. Await the user's `approved` before Phase B; do not begin fixes or rebuild completed features before approval.

- Project uses Next.js 16.4.3, React 19 and JavaScript. Read the installed guides under `node_modules/next/dist/docs/` before any Next.js changes; `AGENTS.md` explains the local requirement.
- The homepage is composed from `src/app/page.js`, layout components in `src/components/layout/`, UI/animation components in `src/components/`, and sections/data in `src/features/landing/`.
- `/services` is composed in `src/app/services/page.js`; `src/features/services/components/ServiceCatalog.jsx` provides client-side category filtering over the shared illustrative service data. Its cards omit direct booking links because the menu and booking backend are not authoritative.
- `/booking` is composed in `src/app/booking/page.js`; `BookingProgress`, `DatePreferencePicker`, and `BookingForm` under `src/features/booking/components/` follow the latest screenshot's text intro, pill step row, service/barber/calendar columns, details/summary row, reviews, and footer. The calendar records a preferred date only; no availability is shown or checked. The form never sends or stores details. See `docs/BOOKING_PAGE_AUDIT.md`.
- `docs/DESIGN_SYSTEM.md` reflects actual CSS tokens and behavior; `docs/COMPONENT_GUIDE.md` documents existing components and boundaries.
- The local salon banners are used in the hero and team intro. The user-requested `public/images/card-image.webp` is reused as a `next/image` source in service, barber, and sample review cards; the repeated image and its visible stock watermark are disclosed. No distinct portrait/service photography is present.
- The review carousel uses labeled sample entries, responsive native scrolling, touch/keyboard/arrow/dot controls, and a 4.6-second auto-advance. Hover, focus, and pointer interaction pause it; reduced motion disables autoplay and uses nonanimated movement. No authentic reviews are asserted.
- `Button` is the shared link/action primitive; primary and outline CTAs use a thin animated gold/teal border, with a static style for carousel controls. The header is transparent and positioned over the hero.
- `SiteHeader` remains a Server Component. It uses `MobileNavigation` for the small interactive menu and shared `siteNavigation` data for desktop/mobile destinations. The full-width bottom border was removed; mobile menu is shown at the 760px content-fit breakpoint and has no opaque panel.
- Scroll reveal has reduced-motion/no-observer fallbacks. Existing appointment links and navbar destinations resolve to the implemented `/booking` route.
- Better Auth remains mandatory for the future auth phase. It is not installed or implemented. No API/database/auth integration was added.
- No Express API, database connection, verified staff roster, availability policy, or booking persistence exists. Service choices and prices remain illustrative. Do not claim that an appointment is available, submitted, or saved.
- Preserve the existing user deletions and untracked assets shown by `git status`; do not restore starter SVGs or remove their image assets.

## Checks and visual status

- `npm.cmd run lint` and `npm.cmd run build` passed after the latest Booking correction. Build output includes `/`, `/services`, `/booking`, and `/_not-found`; `/booking` is partially prerendered, with request-time date data streamed within Suspense.
- Production HTTP check returned 200 for `/`, `/services`, and `/booking`. Booking response markup includes the compact intro, all three selection-step labels, calendar grid, preview-only notice, and review action.
- Booking was visually inspected in Chromium at 1440px, 768px, and 375px. The intro overlaps the shared header at every width, several labels/calendar/helper texts are around 8px, and details/summary stay side-by-side at 768px. No horizontal overflow or console errors were observed. Captures are `booking-1440.png`, `booking-768.png`, and `booking-375.png`. Navbar behavior at 320px and other widths remains unverified.
- No test script is configured. No Lighthouse, bundle, or image-transfer measurements were run.
- Booking details are not submitted or persisted; there is no booking API to integrate. A test suite is not configured.
- The booking composition was corrected against the latest embedded screenshot: removed the photo hero/duplicate heading, added a date preference calendar, compacted the service selector, and moved the review action to the summary. Subsequent browser review documented visible issues; see `docs/BOOKING_PAGE_AUDIT.md`. Do not claim visual conformance.
- No environment variables were introduced; `.env.example` has no secrets.

## Next task

Wait for the user's `approved` to begin Phase B. The Phase A report prioritizes booking policy/API dependencies, the recorded Booking visual issues, then shared security/design foundations. The earlier Booking visual corrections are not yet performed. Before backend work, obtain verified business rules (menu/prices/durations, barber roster, hours/timezone, availability, cancellation, and sign-in requirement); do not invent them. Then implement Express/MongoDB booking validation, availability/concurrency enforcement, and mandated Better Auth authorization before connecting the form.
