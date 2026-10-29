# CLAUDE.md — The Cut barbershop (read AGENTS.md too)

Resume: Read CLAUDE.md and docs/AI_HANDOFF.md, then continue from "Where I stopped".

## Stack
Next.js 16.4.3 App Router (breaking changes: read node_modules/next/dist/docs before Next code), React 19.3, JS/JSX only (no TS), Tailwind 4, Better Auth (DB sessions, TOTP), MongoDB driver 7 (Atlas), Nodemailer (SMTP), ImgBB media, Zod, Vitest, ESLint.

## Commands (Windows: use npm.cmd in PowerShell if npm is blocked)
- `npm run dev` (port 3000), `npm test` (vitest), `npm run lint`, `npm run build`
- Seed: `NODE_ENV=development npm run seed:booking:dev [-- --apply]` (read-only without --apply)

## Structure
- `src/app/**` routes: /, /about, /services, /gallery, /pricing, /booking, /contact, /sign-in, /sign-up, /forgot-password, /reset-password, /design-system (dev), `/api/auth/[...all]`, `/api/bookings/**`, `/api/media`
- `src/components/{layout,ui,motion,contact}`: SiteHeader/HeaderAccount/MobileNavigation/ContactDetails, Button, ButtonLink, CtaBanner, ImageWithFallback; contact cards in `components/contact/ContactInfo.jsx`
- `src/features/{landing,marketing,services,booking,auth,dashboard}` (dashboard shell + primitives; routes `/user`, `/admin`, `/super-admin`, rules in `config/dashboard-access.js`, nav in `config/dashboard-nav.js`); auth client store: `features/auth/session-store.js`
- `src/config`: env.js (zod), routes.js, navigation.js (account menu by role), permissions.js, booking.js (policy and opening hours), booking-services.js (approved catalog), pricing-packages.js, images.js, site.js (contact/social, empty until owner fills)
- `src/lib/{auth,booking,db}`; `scripts/seed-booking.js`; tokens in `src/styles/tokens.css`, globals in `src/app/globals.css`
- Images: slots in `src/config/images.js`, read via `getImage(slot)` (`src/lib/images/server.js`); photo list in `docs/IMAGE_SLOTS.md`
- Docs: docs/*.md; handoff docs/AI_HANDOFF.md, NEXT_TASK.md, docs/PROGRESS.md, docs/REFERENCE_DESIGN_AUDIT.md

## Conventions
- Server authority: Route Handlers/Server Actions, deny-by-default `config/permissions.js` + `lib/auth/policy.js`, ownership scoping, Zod, rate limits (Mongo), audit log, nonce CSP in `src/proxy.js`.
- Roles: GUEST, USER, ADMIN, SUPER_ADMIN (GUEST not stored). Better Auth only, no JWT/Express.
- Booking: America/New_York, USD, 15-min grid, 5-min buffer, 60-min lead, 30-day window, max 3 services, max 2 active bookings, 24h cancel cutoff, pay at shop. Prices come from Mongo service records, never the client.
- Env var NAMES only in .env.example; never open/print .env.

## Status
Phases A-G and the Stage 1-3 cleanup are done: auth (verification off by default via `AUTH_REQUIRE_EMAIL_VERIFICATION`), password reset, toasts (sonner), session-aware header, button map, image slots, mockup alignment of public pages. Seed applied to existing DB `the_cut` (6 services, 4 barbers, empty schedules). **Next: Phase I dashboards, planned in `docs/PHASE_I_PLAN.md` (one unit per owner ok).** Optional Stage 3 leftovers (home barbers/footer details) are TODO in `docs/AI_HANDOFF.md`. Never use the dev server on :3000 for CSS checks if it is stale; use `next build` + `next start -p 3002` (auth only works on the trusted origin :3000).

## Do not
- Run git state-changing commands (user commits; give explicit `git add <paths>` blocks); print secrets; drop/reset DBs; add TypeScript; add parallel auth; start Phase H/I unasked.
- Hardcode prices/colors in components; use one-off CSS overrides instead of tokens/shared components.
