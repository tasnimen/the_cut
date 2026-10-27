# Phase A code audit

**Date:** 2026-10-27  
**Scope:** Existing repository source and configuration, based on `docs/MASTER_PROMPT.md`. This is a static code and documentation audit, not a penetration test or launch certification. No application code was changed.

## Repository snapshot

- Frontend: Next.js App Router 16.4.3, React 19.3.0, JavaScript/JSX, Tailwind CSS 4.
- Implemented routes: `/`, `/services`, `/booking`. All are public. There are no API routes, Server Actions, middleware, Express server, database models, or protected dashboard routes.
- Browser-facing interactions are limited to mobile navigation, scroll reveal, service filters, review carousel, and a preview-only booking form/calendar.
- `npm audit` and `npm audit --omit=dev` each reported **0 known vulnerabilities** at audit time.
- There is no test script or test/e2e suite. Lint/build were not run as part of this audit.
- Git already contains user changes, deleted starter assets, and untracked documentation/images/screenshots. Preserve them; this audit did not alter application files.

## Findings

### Security and authorization

| Severity | Location | Finding and impact | Exact fix |
|---|---|---|---|
| Medium | `next.config.mjs` | No response security headers or CSP are configured. The public preview has no account or mutation surface today, so the present impact is limited; headers are still a launch requirement. | Before adding forms that persist data or private routes, configure and verify CSP (including the chosen nonce strategy), HSTS for HTTPS deployments, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame restrictions, and removal of `X-Powered-By`. Confirm image and API origins are narrowly allow-listed. |
| Informational / future gate | Entire repository; `src/app/**` | No auth/session/token implementation, API, database, private routes, or user-owned queries exist. IDOR, mass assignment, refresh rotation, role escalation, logout invalidation, MongoDB injection, rate limits, audit logging, CSRF, and Atlas settings therefore cannot be verified and are not current code paths. The preview booking form explicitly sends and stores nothing. | Keep the preview disclosure. Before any real booking/account/admin operation, implement the approved Better Auth + Next.js server authority, server-side role and ownership checks, strict validation, concurrency-safe writes, rate limits, and security tests. Do not infer protections from UI state. |
| Low | `package.json`, `package-lock.json` | Dependency advisory check was clean, but no automated dependency update or secret-scanning workflow is present in the repository configuration inspected. | Establish a dependency update process and add secret scanning in the repository/CI before production credentials or backend integrations are introduced. Keep the lockfile committed. |

No source use of `localStorage`, `sessionStorage`, `dangerouslySetInnerHTML`, `eval`, `new Function`, `NEXT_PUBLIC_*`, or application `process.env` was found. `.env.example` contains comments only, and `.gitignore` excludes `.env*` while allowing `.env.example`. No upload or external fetch path exists. These are inventory observations, not proof of production deployment settings.

### Architecture and Next.js

| Severity | Location | Finding and impact | Exact fix |
|---|---|---|---|
| Medium | `src/app/booking/page.js`; `src/app/globals.css`; `docs/AI_HANDOFF.md` | The latest recorded browser review found the booking intro overlapping the absolutely positioned shared header, several labels/calendar/helper texts near 7â€“8px, and the details/summary row remaining side-by-side at 768px. These reduce readability and create a tablet layout mismatch. | Adjust the shared header/booking intro relationship, raise small booking text to a readable size, and stack or rebalance the details/summary row at the tablet breakpoint. Recheck 1440px, 768px, 375px, and narrow mobile in a browser. |
| Low | `src/app/page.js`, `src/app/services/page.js`, `src/app/booking/page.js` | Each route composes `SiteHeader` and `SiteFooter` manually. This is currently simple and behaviorally clear, but creates repeated shell wiring as routes grow. | Keep current composition while route count is small. When another page is implemented, consider a route-group/shared layout only if it preserves the distinct hero/header positioning and does not complicate metadata or page structure. |
| Low | `src/app/**` | No project-owned `loading.js`, `error.js`, or `not-found.js` route boundaries are present. Current pages are mostly static and local, so there is no active data-fetching failure path; future API-backed routes will need explicit pending/error/empty behavior. | Add route-level loading/error/not-found UI when the corresponding async data or route surface is introduced; keep private data uncached and dynamically authorized. |
| Low | `src/components/layout/SiteHeader.jsx`, `src/features/landing/sections/HeroSection.jsx` | Internal navigation is implemented with native anchors in places, causing full document navigations instead of Next client transitions. This is not a correctness/security defect and anchor navigation is useful for in-page destinations. | Use `next/link` for cross-route destinations while retaining native fragment links where appropriate; verify browser back/forward and focus behavior. |

Pages remain mostly composition-only. Client boundaries are limited to the actual interactive leaves: `MobileNavigation`, `ScrollReveal`, `ReviewCarousel`, `ServiceCatalog`, `BookingForm`, and `DatePreferencePicker`. No unnecessary client directive was identified in the route compositions. No circular imports were observed in the inspected import graph. No source component exceeded 200 lines; `src/app/globals.css` is 353 lines and is the main concentrated styling file.

### Product completeness and data integrity

| Severity | Location | Finding and impact | Exact fix |
|---|---|---|---|
| High (release blocker) | `src/app/booking/page.js`; `src/features/booking/components/BookingForm.jsx`; `src/features/landing/data/services.js` | Booking is only a client-side preference preview. It does not submit, persist, verify availability, or confirm an appointment. Services are illustrative and lack final prices/durations; barber roster, opening hours/timezone, cancellation rules, and sign-in policy are unresolved. Treating it as production booking would mislead customers and permit no authoritative reservation. | Obtain the listed business policies, then build the Express/MongoDB booking authority with validated service/barber/date, atomic concurrency protection, and required Better Auth authorization. Connect the UI only after a successful server response; retain truthful error/pending states. |
| Medium | `src/features/landing/sections/BarbersSection.jsx`; `src/features/landing/components/BarberCard.jsx`; `src/features/landing/data/reviews.js`; `src/features/landing/components/ReviewCarousel.jsx`; `public/images/card-image.webp` | Staff cards use generic role/focus copy and the same visibly watermarked stock image. Reviews are generated sample copy, with sample five-star labels. Disclosures exist, but the imagery and polished presentation can still be mistaken for real staff/customer material. | Replace with approved, rights-cleared staff/service/review assets and verified profile/review data before asserting these are real. Until then retain prominent sample labels and avoid fabricated identities or claims. |
| Low | `src/features/booking/components/BookingForm.jsx` | The service radio is required, but preferred date is not required; the date is described as a preference, so current optionality may be intentional. The form also permits arbitrary preferred times and same-day times in the past. No booking is sent, so these values are not currently availability decisions. | Once policy is settled, define required fields and validate date/time against the authoritative business timezone and availability in the authoritative Next.js server; do not trust the browser calendar. |

### Design, accessibility, SEO, and performance

| Severity | Location | Finding and impact | Exact fix |
|---|---|---|---|
| Medium | `src/app/globals.css` | A central set of CSS custom properties exists, but many component/state colors remain literal hex/RGB values. This falls short of the master prompt's zero hardcoded component-color direction and makes palette changes harder to keep consistent. | During foundation/design-system work, promote recurring colors (including overlays, borders, text, hover states, and button surfaces) to named tokens and reference tokens in recipes. Keep one-off image overlay tuning documented where it is genuinely contextual. |
| Medium | `src/app/layout.js`; `src/app/globals.css` | Typography uses system Georgia/Arial stacks rather than self-hosted `next/font` families. The current result is stable and dependency-free but does not meet the requested display/UI typography direction. | Select licensed/self-hosted font files, load them with the installed Next.js font API, define the font variables centrally, and check layout shift and fallback metrics. |
| Medium | `public/images/banner1.png`, `public/images/banner2.png` | The two above-the-fold hero assets are PNGs of about 1.7 MB and 2.1 MB before optimization. Next Image is used with fill/sizes and preload, but deployed transfer size, LCP, and optimizer output have not been measured. | Produce appropriately sized modern source assets where licensing permits, preserve responsive `sizes` and preload only the actual LCP image, then measure production LCP and transfer size. |
| Medium | `src/app/**` | Route metadata currently supplies title and description only. Canonicals, Open Graph/Twitter metadata, local-business structured data, sitemap, and robots policy are absent. | Add canonical/social metadata and only supportable structured data for each public route; add sitemap/robots once the public URL inventory and domain are known. Do not invent business address, rating, menu, or hours. |
| Low | `src/app/globals.css`; `src/features/booking/components/DatePreferencePicker.jsx` | Several booking labels/helper texts are 7â€“8px per source and the handoff records that rendered sizes are difficult to read. Calendar weekday labels use two-letter abbreviations and buttons expose full dates, but keyboard behavior has not been manually tested. | Resolve the documented readability issue; manually check keyboard focus/order, contrast, zoom, and screen-reader announcements after layout changes. |
| Low | `src/features/landing/components/ReviewCarousel.jsx` | Carousel implements keyboard arrows, native scrolling, control buttons, pause-on-interaction, and reduced-motion handling. It also auto-advances at a fixed 4.6-second interval. | Keep current safeguards; verify whether automatic movement is acceptable for the final content and provide a persistent user pause option if required by the final accessibility review. |
| Informational | `src/features/landing/sections/HeroSection.jsx`, `src/features/landing/sections/BarbersSection.jsx`, `src/features/landing/sections/ReviewsSection.jsx` | No browser-based visual, contrast, keyboard, Lighthouse, or responsive review was run during this audit. The handoff contains a prior browser review for Booking only; it is not evidence for the other routes. | Complete per-route visual/accessibility review as each page is finalized and record the actual viewports/tools/results. No conformance claim should be based on source inspection alone. |

### Code quality and tests

| Severity | Location | Finding and impact | Exact fix |
|---|---|---|---|
| Medium | `package.json`; repository | There is no test script, unit test suite, integration suite, or Playwright E2E suite. Interactive client behavior and route expectations are therefore not regression-tested. | Add tests with the relevant feature/API milestones: component behavior and validation first, then route/role matrix, booking concurrency, IDOR, injection, and browser flows as backend surfaces exist. |
| Low | JavaScript source under `src/` | Source is JavaScript/JSX as required, but there is little JSDoc and no `// @ts-check` usage; editor/static type checking is limited. | Add strict JSDoc and enable `// @ts-check` incrementally on touched modules without introducing TypeScript files or blocking current milestones. |

## Route and authorization inventory

| Route | Implemented behavior | Access finding |
|---|---|---|
| `/` | Public marketing composition | No authentication/authorization requirement. |
| `/services` | Public illustrative service catalog and client-side category filter | No authentication/authorization requirement. |
| `/booking` | Public preview form; client-only state; no network request or persistence | Not a real booking endpoint; no confirmation is claimed. |

There are no other application routes, handlers, layouts, actions, or DAL functions to compare against the role matrix. `config/permissions.js` and a central route registry do not exist, so the planned role table in `docs/ROLE_PERMISSIONS.md` is not enforced by code. The current three routes are public; no private data path was found.

## Prioritized fix plan

1. **Before any real booking:** settle final menu/prices/durations, verified staff, timezone/hours, availability and buffers, cancellation policy, and account requirement. Implement and test the authoritative Next.js booking operation and Better Auth authorization before connecting the form. Do not add a separate Express server.
2. **Next UI correction:** fix the Booking header overlap, tiny type, and tablet details/summary layout recorded in the existing handoff; inspect browser output at desktop/tablet/mobile.
3. **Before protected features:** implement the authoritative Better Auth server architecture inside Next.js, route/permission registry, ownership-scoped DAL, strict validation, headers/CSP, rate limits, audit logging, and role/attack tests. No current business mutation is safe to enable without this layer.
4. **Design/performance foundation:** centralize recurring CSS colors, add the selected self-hosted font pair, and optimize/measure above-the-fold imagery.
5. **Before public launch:** complete metadata/SEO, accessibility/manual visual review, test coverage, and dependency/secret scanning workflow; use only verified business content/assets.

## Keep / refactor / rewrite

| Module | Decision | Rationale |
|---|---|---|
| `src/app/page.js`, `src/app/services/page.js` and landing/service sections | **Keep** | Server-rendered composition is straightforward and preserves useful reusable sections. Add routes/features incrementally. |
| `src/components/layout/` and `src/components/ui/` | **Keep; refactor selectively** | Existing shared header/footer, button, image, icon, and heading primitives are small. Address documented header positioning and accessibility gaps at the shared level. |
| `src/features/landing/` | **Keep; refactor content/data** | Section and card boundaries are reasonable; replace illustrative/stock material when verified sources are available. |
| `src/features/booking/` | **Keep as disclosed preview; refactor for backend integration** | The interface and preference controls are reusable. Do not treat the current form as a reservation system or rewrite it wholesale. |
| `src/app/globals.css` | **Refactor incrementally** | It is a single 353-line stylesheet with centralized top-level tokens but many literal colors and tightly grouped route rules. Extract named tokens/recipes when foundations are addressed; preserve current visual behavior. |
| Future Next.js server/API, auth, MongoDB, dashboards | **Not present; implement as new modules after policy/approval** | No existing implementation is available to rewrite or audit for behavior. Follow the approved architecture and security gates when those phases are authorized. |

## Security gate snapshot (master prompt Â§11.2)

**Result: not applicable to a feature mutation in this audit; launch gate remains open.** There are no new routes/actions or attack surfaces from this documentation-only task. Authorization, permission registry, ownership scoping, DTOs, boundary validation, rate limiting, CSP/headers, audit events, upload controls, and security tests are absent because their corresponding backend features are not implemented. Do not interpret the clean npm advisory result as an application security certification.

## Commands run

- `npm.cmd audit --omit=dev` â€” passed; 0 known vulnerabilities.
- `npm.cmd audit` â€” passed; 0 known vulnerabilities.
- Static file inventory and source-pattern searches â€” completed; no application tests were run.


## Phase B completion

The audit reflects the repository and architecture documentation as inspected in Phase A. In Phase B, the user explicitly selected Next.js Server Actions and Route Handlers as the future backend boundary. This decision supersedes any earlier Express proposal; no backend was implemented in Phase B.

- Added shared color/font tokens, Tailwind aliases, self-hosted font setup, site/route/navigation/permission/environment config, validated server environment, and baseline security headers.
- Updated internal navigation to use the central route/anchor registry while preserving existing page composition and interactions.
- Corrected the three recorded Booking layout defects at the shared header/style level. Playwright recheck at 1440px, 768px, and 375px found no overlap, horizontal overflow, or browser errors; details and summary stack at 768px.
- `npm.cmd run lint` and `npm.cmd run build` passed. Package install audit reported zero known vulnerabilities.
- Security checklist result: **foundation-only / partial**. No authentication, database, mutation/API, protected route, upload, or user-owned data was added. Baseline headers are configured; CSP remains open pending nonce/deployment design. Permissions config is descriptive and not enforcement. This is not a launch certification.
