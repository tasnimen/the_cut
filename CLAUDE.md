# CLAUDE.md — The Cut barbershop (read AGENTS.md too)

Resume: Read CLAUDE.md and docs/AI_HANDOFF.md, then continue from "Where I stopped".

## Stack
Next.js 16.4.3 App Router (breaking changes: read node_modules/next/dist/docs before Next code), React 19.3, JS/JSX only (no TS), Tailwind 4, Better Auth (DB sessions, TOTP), MongoDB driver 7 (Atlas), Nodemailer (SMTP), Cloudinary media (server-signed uploads; ImgBB is legacy, only for older images), Zod, Vitest, ESLint.

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
- Docs: docs/*.md; handoff docs/AI_HANDOFF.md, root NEXT_TASK.md, docs/PROGRESS.md, docs/DASHBOARD_CRUD_GAPS.md, docs/REFERENCE_DESIGN_AUDIT.md

## Conventions
- Server authority: Route Handlers/Server Actions, deny-by-default `config/permissions.js` + `lib/auth/policy.js`, ownership scoping, Zod, rate limits (Mongo), audit log, nonce CSP in `src/proxy.js`.
- Roles: GUEST, USER, ADMIN, SUPER_ADMIN (GUEST not stored). Better Auth only, no JWT/Express.
- Admin capabilities: the Super Admin can switch Admin pages and actions off (`config/admin-capabilities.js`, grants in Mongo, `docs/ADMIN_PERMISSIONS.md`). Admin switches are default deny (nothing saved = overview only); a group with no view switch (site images) depends only on its own switch; the admin layout refuses a revoked page via the proxy's x-pathname header for a real HTTP 404. Every new admin Server Action, admin API route and admin page MUST pass a capability: `requirePrincipal(permission, { capability })` and `requireDashboardAccess("admin", { capability })`, and the capability must be in the catalog (a test fails otherwise). Also hide its buttons and menu entry from the switches (`effectiveCapabilities`, `filterNavByCapabilities`); hiding is only a convenience. SUPER_ADMIN is never limited; sign-in and TOTP code are not touched by this system.
- Booking: America/New_York, USD, 15-min grid, 5-min buffer, 60-min lead, 30-day window, max 3 services, max 2 active bookings, 24h cancel cutoff, pay at shop. Prices come from Mongo service records, never the client.
- Env var NAMES only in .env.example; never open/print .env.

## Status
Phases A-G, the Stage 1-3 cleanup, Phase I units I-1 to I-17, I-19, I-20, I-22, the Cloudinary switch (C1, C2) and D1 (pictures for services, barbers, packages) are built and tested (642 tests, lint and build clean). Admin screens are not yet live-verified as an admin; do not mark them verified. The Admin capability engine (P1) and the Super Admin permission screen (P2, `/super-admin/permissions`) are built; pending: owner live test of the admin side and permissions, D2 (archive and delete), I-23 to I-30. See root NEXT_TASK.md and docs/PROGRESS.md. Never use the dev server on :3000 for CSS checks if it is stale; use `next build` + `next start -p 3002` (auth only works on the trusted origin :3000, or override SITE_URL and BETTER_AUTH_URL for the test port).

## Documentation (strict, every task)
Documentation is part of finishing a task, never optional. After any change: update docs/PROGRESS.md (done work and status), root NEXT_TASK.md (pending tasks), docs/AI_HANDOFF.md (resume line and "Where I stopped"), CLAUDE.md and AGENTS.md when architecture, standards or rules change, and the technical docs it touches (SECURITY, ROLE_PERMISSIONS, DATABASE, TESTING, DECISIONS, IMAGE_SLOTS, API routes). Document every new permission, route restriction, role-based behavior and security rule, plus decisions and known limitations. Only call a feature complete if it is implemented; say "not verified live" until it is. Before finishing: review affected docs, check them against the code, and report which docs were created or updated.

## Do not
- Run git state-changing commands (user commits; give explicit `git add <paths>` blocks); print secrets; drop/reset DBs; add TypeScript; add parallel auth; start Phase H/I unasked.
- Hardcode prices/colors in components; use one-off CSS overrides instead of tokens/shared components.
