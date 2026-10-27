# AI handoff

**Updated:** 2026-10-27

## Resume prompt

Read `/docs/AI_HANDOFF.md` and `/docs/MASTER_PROMPT.md`. Continue from “Next task,” preserve work marked DONE, and use the project-specific overrides. Read other docs when relevant to the task.

## Current status

- Phase A audit: **DONE** — `docs/AUDIT.md`.
- Phase B foundations: **DONE** — tokens, Tailwind mappings, fonts, config, environment validation, baseline headers, and Booking layout fixes.
- Phase C design system: **DONE** — shared primitives/shells, glass/depth recipes, motion runtime, deferred hero canvas, and development-only design-system route.
- Phase D security/data foundation: **IN PROGRESS, PARTIAL, not DONE** — Better Auth + MongoDB server foundation, route handler, authorization guard, failed-auth audit/burst markers, explicit TOTP lockout, session-bound step-up proof helper, and expanded unit tests exist. External/production/security gate blockers remain.
- Phase E public pages: **IMPLEMENTED** — About, Gallery, Pricing, and Contact preview routes, metadata, robots, sitemap, navigation, and responsive layout. Site facts and contact delivery remain unverified or deferred.
- Current application: Next.js 16.4.3 App Router, React 19.3.0, JavaScript/JSX, Tailwind CSS 4.
- Backend direction: keep future operations in Next.js Server Actions and Route Handlers. No separate Express server. This is the user-selected project direction.
- Better Auth/DB security foundation: **PARTIAL**. Auth endpoints, pooled MongoDB adapter, session/version authorization, TOTP, auth rate limits, audit events for privileged sessions/denials/failed sign-ins/TOTP/bursts, account lockout, step-up proof, and user-update version bumps for role/status/2FA changes exist. The local no-cookie session endpoint returned HTTP 200; signup/email lifecycle, production auth checks, external notifications, and integration of step-up into privileged mutations remain open.

## Exactly where work stopped

Phase D security hardening resumed after Phase E. Failed auth attempts are pseudonymized and append-audited, a burst event is emitted at repeated-IP thresholds, and successful TOTP verification can issue a ten-minute step-up cookie validated by `requireRecentStepUp(principal)`. Auth remains mounted at `/api/auth/[...all]`; its DB session is authoritative and cookie caching is disabled. Phase D remains partial: no business mutation consumes step-up, and external alert delivery, full email lifecycle, Atlas-backed invalidation, production proxy/origin/cookie checks, and the full security suite remain open. See `docs/SECURITY.md`.

## Checks and visual status

- `npm.cmd run lint` — passed after Phase D (one existing `aria-hidden` type warning in `HeroSection.jsx`).
- `npm.cmd run build` — passed after Phase D; `/api/auth/[...all]` and the existing pages compiled.
- Current Phase D `npm.cmd test` — 10 tests passed across 3 files; `npm.cmd run lint` passed with the existing HeroSection `aria-hidden` warning; `npm.cmd run build` passed with `/api/auth/[...all]` compiled.
- Edge/Playwright on the production build and localhost:3000 — nonce CSP present; inline scripts had nonces and no console errors. `/booking` was checked at 1440, 768 and 375px. Development requires a dev-only style exception for the Next overlay.
- `npm.cmd audit --omit=dev --offline` — found 0 vulnerabilities in installed production dependencies; re-run online before release for current advisories.
- Production HTTP smoke check: `/`, `/services`, and `/booking` returned 200; `/design-system` returned 404.
- Phase E `npm.cmd run lint` passed with the existing HeroSection `aria-hidden` warning; `npm.cmd run build` passed.
- Edge/Playwright against localhost:3000 and the production build at 3001: `/about`, `/gallery`, `/pricing`, and `/contact` returned 200 at 1440/768/375px without horizontal overflow or page errors. Gallery category filtering and dialog Escape close passed.
- `/robots.txt` and `/sitemap.xml` returned 200; robots disallows `/api/`. The current localhost origin is excluded from sitemap URLs.
- Development HTTP check at `http://localhost:3000/design-system` returned 200.
- Phase C npm install completed and reported 0 vulnerabilities.
- Playwright/Chrome — at 1440, 768, and 375px, the intro begins at or below the header bottom; details/summary use two columns at 1440 and one at 768/375; no horizontal overflow or console errors. Smallest measured booking text was 11px desktop/tablet and 9px mobile progress labels.
- The booking form remains preview-only and sends/stores nothing. No appointment success is reported.
- Local `.env` now supplies the server-side MongoDB and Better Auth variables. `GET http://localhost:3000/api/auth/get-session` returned HTTP 200, exercising the local database-backed handler and first-use indexes; signup/session lifecycle and production database behavior remain unverified. No email provider is configured, so verification/reset delivery cannot be exercised.
- Better Auth DB sessions are selected for this same-origin app; the separate refresh-token requirement is superseded. Auth endpoints have Mongo-backed per-IP rate limits; privileged session creation, permission denials, failed sign-in/TOTP attempts, and burst markers are audited. Nonce CSP is implemented. External alerts, audit coverage for privileged field changes, tested DB session invalidation, sensitive-operation step-up integration, trusted-proxy/production-origin review, and the Section 11.1 attack suite remain open; Phase D is not DONE.
- Phase C dependencies (`class-variance-authority`, `clsx`, `tailwind-merge`, `motion`, `gsap`, `lenis`, `three`, and `@react-three/fiber`) installed; npm reported 0 vulnerabilities.

## Next task

Continue Phase D verification only: external alert delivery, privileged mutation step-up integration when such mutations exist, Atlas-backed invalidation, full email lifecycle, production cookie/proxy/origin checks, and the Section 11.1 suite remain open. Do not start Phase F until the user reviews this checkpoint and says “continue.” Keep all operations inside Next.js Server Actions/Route Handlers; preserve completed work and do not invent business policies or identities.

## File map

- `src/app/` — root layout, Home, About, Services, Gallery, Pricing, Contact preview, Booking preview, metadata routes.
- `src/app/design-system/page.js` — development-only shared component preview; production returns 404.
- `src/config/` — site metadata, route/anchor registry, navigation, permission map, validated server environment.
- `src/styles/tokens.css` — shared CSS palette and Tailwind theme aliases.
- `src/app/globals.css` — shared component recipes and responsive styles.
- `src/components/` — layout, UI primitives, and small animation wrappers.
- `src/components/three/` — deferred decorative R3F hero field; never business UI.
- `src/lib/motion/` — shared motion durations, easing curves, and reveal variants.
- `src/lib/auth/security-events.js` — pseudonymized auth identifiers and signed, session-bound recent-TOTP proof helpers.
- `src/features/` — landing, services, and preview-only booking modules/data.
- `src/features/marketing/` — shared public-page hero, illustrative gallery data, filter, and dialog.
- `docs/AUDIT.md` — Phase A code audit and prioritized fix plan.
- `docs/BOOKING_PAGE_AUDIT.md` — Booking reference and browser review record.
- `docs/DECISIONS.md`, `docs/SECURITY.md`, `docs/ROLE_PERMISSIONS.md` — current architecture/security choices and permission map.

## Key decisions and conventions

- JavaScript/JSX only; no `.ts`/`.tsx` or TypeScript configuration.
- Next.js Server Actions and Route Handlers are the planned backend boundary; do not add Express.
- Better Auth only; Phase D auth foundation is partial, with no login UI or business operations yet.
- `src/config/routes.js` owns live URL/anchor values and public access entries. `src/config/navigation.js` owns navigation labels/paths. `src/config/permissions.js` is the role capability source; `src/lib/auth/authorization.js` enforces it for future server operations.
- `src/config/env.js` is server-only and Zod-validates `NODE_ENV`, site/auth URLs, and server secrets. Do not put secrets in `NEXT_PUBLIC_*`.
- `/design-system` is development-only, excluded from public navigation, and returns 404 outside development.
- Services, barbers, reviews, prices, availability, and hours remain illustrative or unverified. The booking calendar collects preferences only.
- Preserve existing user asset deletions and untracked assets. Do not restore starter SVGs or overwrite existing screenshots.

## Environment and commands

- Environment variable names: `NODE_ENV`, `SITE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `MONGODB_URI`, `MONGODB_DB_NAME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO`. Resend SMTP is selected; actual mail configuration is still pending Phase F.
- Install: `npm.cmd install`.
- Dev: `npm.cmd run dev` (project server uses port 3000).
- Lint/build: `npm.cmd run lint`, `npm.cmd run build`.
- Tests: `npm.cmd test` runs Vitest; current suite covers permission defaults and session-version comparisons. Playwright dependency is installed; no persistent browser auth suite exists.
- Google font imports are self-hosted by Next at build time and require build-time access to Google Fonts unless cached.

## Known issues and design tokens

- Need verified booking policies, staff identities, authentic reviews, approved card photography, business contact/hours, and deployment-origin/trusted-proxy validation for the implemented nonce CSP.
- Current principal tokens: background `#041018`, surface `#071923`, raised surface `#0a2029`, border `#174452`, cream text `#f2e8d9`, muted `#9daeb0`, gold `#dba663`, light gold `#f0c487`.
- Display font: Cormorant Garamond. UI font: Manrope. Both use `next/font` with Latin subsets and `display: swap`.
- Glass sizes: 10/16/22px blur with opaque fallback; depth levels use named shadow tokens. Tilt is capped at 4 degrees and reduced-motion safe.
- Smooth scrolling loads Lenis + GSAP/ScrollTrigger after idle and shares one GSAP ticker. R3F gold dust is home-only, deferred until idle/in-view, and skipped for reduced-motion/low-power devices.
