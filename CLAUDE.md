# CLAUDE.md — The Cut barbershop (read AGENTS.md too)

Resume: Read CLAUDE.md and docs/AI_HANDOFF.md, then continue from "Where I stopped".

## Stack
Next.js 16.4.3 App Router (breaking changes: read node_modules/next/dist/docs before Next code), React 19.3, JS/JSX only (no TS), Tailwind 4, Better Auth (DB sessions, TOTP), MongoDB driver 7 (Atlas), Nodemailer (SMTP), ImgBB media, Zod, Vitest, ESLint.

## Commands (Windows: use npm.cmd in PowerShell if npm is blocked)
- `npm run dev` (port 3000), `npm test` (vitest), `npm run lint`, `npm run build`
- Seed: `NODE_ENV=development npm run seed:booking:dev [-- --apply]` (read-only without --apply)

## Structure
- `src/app/**` routes: /, /about, /services, /gallery, /pricing, /booking, /contact, /sign-in, /sign-up, /design-system (dev), `/api/auth/[...all]`, `/api/bookings/**`, `/api/media`
- `src/components/{layout,ui,motion,contact}`: SiteHeader/MobileNavigation/HeaderAccountLink, Button, ButtonLink, Surface, CardImage
- `src/features/{landing,marketing,services,booking,auth}`; auth client store: `features/auth/session-store.js`
- `src/config`: env.js (zod), routes.js, navigation.js, permissions.js, booking.js, booking-services.js (approved catalog)
- `src/lib/{auth,booking,db}`; `scripts/seed-booking.js`; tokens in `src/styles/tokens.css`, globals in `src/app/globals.css`
- Images: slots in `src/config/images.js`, read via `getImage(slot)` (`src/lib/images/server.js`); photo list in `docs/IMAGE_SLOTS.md`
- Docs: docs/*.md; handoff docs/AI_HANDOFF.md, NEXT_TASK.md, docs/PROGRESS.md, docs/REFERENCE_DESIGN_AUDIT.md

## Conventions
- Server authority: Route Handlers/Server Actions, deny-by-default `config/permissions.js` + `lib/auth/policy.js`, ownership scoping, Zod, rate limits (Mongo), audit log, nonce CSP in `src/proxy.js`.
- Roles: GUEST, USER, ADMIN, SUPER_ADMIN (GUEST not stored). Better Auth only, no JWT/Express.
- Booking: America/New_York, USD, 15-min grid, 5-min buffer, 60-min lead, 30-day window, max 3 services, max 2 active bookings, 24h cancel cutoff, pay at shop. Prices come from Mongo service records, never the client.
- Env var NAMES only in .env.example; never open/print .env.

## Status
Phases A–G done locally; seed applied to existing DB `the_cut` (6 services, 4 barbers, empty schedules). Phase H/I not started. Design mockups: docs/design/ ("The Cut_ Luxury Barbershop Website Collection.png" = public pages, "deshboard.png" = dashboards). Design audit: docs/REFERENCE_DESIGN_AUDIT.md.

## Do not
- Run git state-changing commands (user commits); print secrets; drop/reset DBs; add TypeScript; add parallel auth; start Phase H/I unasked.
- Hardcode prices/colors in components; use one-off CSS overrides instead of tokens/shared components.
