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
| Mobile menu | Toggle | Open menu | opens panel, Escape and outside click close | works; focus trap missing (fix) |
| Mobile menu | Account block, Sign out | Sign out | real sign-out | works |
| Hero | Primary CTA | Book an appointment | `/booking` | works |
| Hero | Secondary link | Our story | `/about` | works (mockup "Watch Our Story" needs a video: TODO) |
| Home services | "View all services" | View all services | `/services` | works |
| Home services | Service card button (6) | Book Now | `/booking`, **no service preselected** | fix |
| Home barbers | "Meet the team" | Meet the team | `/#team-profiles` anchor | works (anchor on same page) |
| Home reviews | Carousel arrows | prev / next | scrolls carousel | works; section holds sample copy (U2 rule: hide until real reviews) |
| Services page | Hero button | Explore the menu | `/services#service-catalog` | works |
| Services page | Category tabs | All, Hair, Beard, Shave… | client filter | works |
| Services page | Service cards | — | **no action button** (`actionHref` null) | fix: add Book Now with preselect |
| Services page | Note button | (check) | `ROUTES.services`/booking | works |
| Pricing | Package buttons (3) | Book Now | `/booking`, **no package preselected** | fix |
| Gallery | Category filters | All, Haircuts… | client filter | works |
| Gallery | Card buttons, dialog Close | View image, Close | opens/closes `<dialog>` | works |
| About | CTA | Explore services | `/services` | works |
| Contact | CTA | (services link) | `/services` | works |
| Contact | Phone, email, address, hours | — | **not shown** (`site.js` has no values) | TODO: need real data from the owner; render `tel:`/`mailto:`/Maps link only when set |
| Contact | Form submit | Send message | server action, toasts, Turnstile hook | works (loading state present) |
| Booking | Service checkboxes, barber select, date, time select | — | live availability | works |
| Booking | Confirm | Confirm Appointment | `POST /api/bookings`, toasts; guests sent to sign-in with callback | works; no slots until barber schedules exist |
| Booking | Wizard Next / Back | — | page is a single form with a progress indicator, no Next/Back | decision needed (keep single form or build stepper) |
| Booking | Cancel / Reschedule | — | API exists (`/api/bookings/[id]/cancel`, `/reschedule`), **no UI** | build (needs a "My appointments" page) |
| Sign in / Sign up | Submit | Sign in / Create account | Better Auth, toasts, callbackUrl | works |
| Sign in / Sign up | Switch link | Create account / Sign in | other auth page | works |
| Sign in | Forgot password | — | **not built** (no reset flow) | build or hide |
| Footer | Explore links (6) | Our story … Contact | existing routes | works |
| Footer | CTA | Book an appointment | `/booking` | works |
| Footer | Find us | New York, US; "Opening hours to be confirmed" | plain text | TODO (address, hours not supplied) |
| Footer | "Policies to be published" | — | plain text, no page | TODO (no privacy/terms pages) |
| Footer | Newsletter form (mockup) | — | not present | build (Subscriber collection, Zod, honeypot, rate limit) or leave out |
| Footer | Social icons (mockup) | — | not present | TODO (render only when URLs are set in `config/site.js`) |

## Proposed U1 fix order

1. **Preselect:** `?service=<slug>` and `?package=<slug>` on `/booking`, validated against the catalog on the server; wire the home cards, services cards and pricing cards (small-medium).
2. **Config for contact data:** add `phone`, `email`, `address`, `hours`, `social` to `config/site.js` (empty by default); render `tel:`, `mailto:`, a Google Maps link and social icons only when set; footer and contact page read from it (small).
3. **Mobile menu:** focus trap and 44px targets; check focus rings on shared buttons (small).
4. **Forgot password:** reset request + reset page with Nodemailer (medium) — or hide until built.
5. **Newsletter:** end-to-end (medium) — or leave out.
6. **My appointments page** with Cancel and Reschedule (medium-large), which also makes the account-menu links real.
7. **Booking Next/Back stepper:** only if you want it (medium).
