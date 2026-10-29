# Button and link map

**Audit date:** 2026-10-29 (read-only audit of `src/`, before any U1 fixes). Statuses: **works** (real destination or behavior), **fix** (exists but wrong or incomplete), **build** (needs a new feature), **hide** (remove until its dependency exists), **TODO** (blocked on content or a decision). Hard-coded `href="#"`: none found. Buttons without `type`: none (three multi-line false positives in `GalleryGrid.jsx` were checked by hand). Touch-target size (44px) and focus rings were not measured in this audit.

| Page / component | Element | Label | Action or destination | Status |
|---|---|---|---|---|
| Header | Brand mark | The Cut | `/` | works |
| Header | Primary nav (6 links) | Home … Contact | `config/navigation.js` | works |
| Header | Sign in / Sign up | Sign in, Sign up | `/sign-in`, `/sign-up` | works |
| Header | Avatar dropdown | avatar | menu, Sign out | works (links beyond Book Appointment are `enabled:false`) |
| Header | CTA | Book Appointment | `/booking` | works |
| Header | Search icon (mockup) | — | not rendered | hide / TODO (no search feature) |
| Header | Shop link (mockup) | — | not rendered | TODO (Shop not built) |
| Mobile menu | Toggle | Open menu | opens panel; Escape, outside click, focus trap | works (verified at 375 px; targets 44 px) |
| Mobile menu | Account block, Sign out | Sign out | real sign-out | works |
| Hero | Primary CTA | Book an appointment | `/booking` | works |
| Hero | Secondary link | Our story | `/about` | works (mockup "Watch Our Story" needs a video: TODO) |
| Home services | "View all services" | View all services | `/services` | works |
| Home services | Service card button (6) | Book Now | `/booking?service=<slug>` | works (verified) |
| Home barbers | "Meet the team" | Meet the team | `/#team-profiles` anchor | works (anchor on same page) |
| Home reviews | Carousel arrows | prev / next | scrolls carousel | works; section holds sample copy (U2 rule: hide until real reviews) |
| Services page | Hero button | Explore the menu | `/services#service-catalog` | works |
| Services page | Category tabs | All, Hair, Beard, Shave… | client filter | works |
| Services page | Service cards (6) | Book Now | `/booking?service=<slug>` | works (verified) |
| Services page | Note button | (check) | `ROUTES.services`/booking | works |
| Pricing | Package buttons (3) | Book Now | `/booking?package=<slug>` (maps to catalog services) | works (verified); note package price differs from the catalog price |
| Gallery | Category filters | All, Haircuts… | client filter | works |
| Gallery | Card buttons, dialog Close | View image, Close | opens/closes `<dialog>` | works |
| About | CTA | Explore services | `/services` | works |
| Contact | CTA | (services link) | `/services` | works |
| Contact | Contact information card | Phone / Email / Address / Follow us | `tel:`, `mailto:`, keyless Google Maps link and https social links, each only when set in `config/site.js`; all empty shows "Contact details coming soon." | works; **TODO: owner has not supplied phone, email, street address, social URLs** |
| Contact | Opening hours card | hours (ET) | from `config/booking.js` (12-hour), plus holiday closures / early close from the same config | works |
| Contact | Map card | Open in Google Maps | rendered only when a street address exists (no embed, no API key) | works (hidden until an address is set) |
| Contact | Form submit | Send Message | server action, toasts, Turnstile hook | works (loading state present) |
| Booking | Service checkboxes, barber select, date, time select | — | live availability | works |
| Booking | Confirm | Confirm Appointment | `POST /api/bookings`, toasts; guests sent to sign-in with callback | works; no slots until barber schedules exist |
| Booking | Wizard Next / Back | — | single form with progress indicator | skipped by decision |
| Booking | Cancel / Reschedule | — | API exists, no UI | TODO: part of the Phase I user dashboard |
| Sign in / Sign up | Submit | Sign in / Create account | Better Auth, toasts, callbackUrl | works |
| Sign in / Sign up | Switch link | Create account / Sign in | other auth page | works |
| Sign in | Forgot your password? | link | `/forgot-password` → mail → `/reset-password` | works (mock-transport test; live: unknown address, bad token) |
| Footer | Explore links (6) | Our story … Contact | existing routes | works |
| Footer | CTA | Book an appointment | `/booking` | works |
| Footer | Find us | New York, NY + hours + optional tel/mailto/Maps/social | `ContactDetails` | works |
| Footer | Policies line | — | removed until the owner supplies policy text | hidden (TODO) |
| Footer | Newsletter form (mockup) | — | not present | hidden for now (TODO) |
| Footer | Social icons (mockup) | — | not present | TODO (render only when URLs are set in `config/site.js`) |

## Proposed U1 fix order

1. **Preselect:** `?service=<slug>` and `?package=<slug>` on `/booking`, validated against the catalog on the server; wire the home cards, services cards and pricing cards (small-medium).
2. **Config for contact data:** add `phone`, `email`, `address`, `hours`, `social` to `config/site.js` (empty by default); render `tel:`, `mailto:`, a Google Maps link and social icons only when set; footer and contact page read from it (small).
3. **Mobile menu:** focus trap and 44px targets; check focus rings on shared buttons (small).
4. **Forgot password:** reset request + reset page with Nodemailer (medium) — or hide until built.
5. **Newsletter:** end-to-end (medium) — or leave out.
6. **My appointments page** with Cancel and Reschedule (medium-large), which also makes the account-menu links real.
7. **Booking Next/Back stepper:** only if you want it (medium).

## U1 fixes 1-3 (2026-10-29)

Done: preselect (`lib/booking/preselect.js`, validated against the catalog on the server), contact config + `ContactDetails` (footer and contact page), mobile menu focus trap, 44 px targets on touch/mobile. Decisions applied: newsletter hidden, policies link hidden, Cancel/Reschedule deferred to Phase I dashboard, stepper skipped. Forgot password is the next unit.

## Forgot password (2026-10-29)

New: `/forgot-password`, `/reset-password`, Better Auth `sendResetPassword`/`onPasswordReset`, `sendPasswordResetEmail` (Nodemailer). Not sent live to a real address in testing.

## Contact page (2026-10-29)

Layout is now info/map/hours cards on the left and the message form on the right (stacked on <= 980 px). Not verified live with filled contact details (config still empty) or with a real form submission (would send mail).
