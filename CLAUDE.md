# CLAUDE.md — The Cut barbershop (read AGENTS.md too)

Resume: read this file, then docs/PROJECT_STATUS.md (full status) and docs/AI_HANDOFF.md ("Where I stopped"), then root NEXT_TASK.md. Work follows docs/EXECUTION_PLAN.md (stages A to E): finish a stage, report in at most 12 lines, then STOP until the owner writes "start".

## Stack
Next.js 16.4.3 App Router (breaking changes: read node_modules/next/dist/docs before Next code), React 19.3, JS/JSX only (no TypeScript), Tailwind 4, Better Auth (database sessions, TOTP), MongoDB driver 7 (Atlas, dev database `the_cut`), Nodemailer (SMTP), Cloudinary media (server-signed uploads; ImgBB only for old images), Zod, Vitest, ESLint.

## Commands (Windows: use npm.cmd in PowerShell if npm is blocked)
- `npm run dev` (port 3000), `npm test`, `npm run lint`, `npm run build`
- `NODE_ENV=development npm run seed:booking:dev [-- --apply]` (read-only without --apply; never apply over edited prices), `npm run seed:admins:dev`, `npm run check:cloudinary`
- Production check: `next build` + `next start -p 3002` (auth works only on :3000 unless SITE_URL and BETTER_AUTH_URL are overridden)

## Structure
- `src/app/**` routes: public pages (/, /about, /services, /gallery, /pricing, /contact, /booking), auth pages, `/user/*`, `/admin/*`, `/super-admin` (+ `/permissions`), `/api/{auth,bookings,media,account,admin}`
- `src/features/{landing,marketing,services,booking,auth,dashboard}`; `src/components/{layout,ui,motion,contact}`; `src/lib/{auth,booking,catalog,db,gallery,images,storage,security,...}`
- `src/config`: env, routes, navigation, permissions (role matrix), admin-capabilities (Admin switches), dashboard-access and dashboard-nav, booking policy and services, images (slots), site
- Tokens in `src/styles/tokens.css`, globals in `src/app/globals.css`; image slots read through `getImage(slot)`
- Docs: `docs/*.md`; status `docs/PROJECT_STATUS.md`; handoff `docs/AI_HANDOFF.md`; root `NEXT_TASK.md`; permissions `docs/ROLE_PERMISSIONS.md` and `docs/ADMIN_PERMISSIONS.md`

## Conventions
- Server authority: Route Handlers and Server Actions re-check everything; deny-by-default `config/permissions.js` + `lib/auth/policy.js`, ownership scoping, Zod, Mongo rate limits, audit log, nonce CSP in `src/proxy.js`.
- Roles: GUEST (not stored), USER, ADMIN, SUPER_ADMIN. One Super Admin, one Admin, many Users. Better Auth only; no JWT, no Express, not multi-tenant.
- Admin switches (`config/admin-capabilities.js`, grants in Mongo, one shared set): default deny (nothing saved means the overview only). Every new admin Server Action, API route and page MUST pass a capability: `requirePrincipal(permission, { capability })` and `requireDashboardAccess("admin", { capability })`, and it must be in the catalog (a test fails otherwise). Hide its buttons and menu entry with `effectiveCapabilities` and `filterNavByCapabilities`; hiding is only a convenience. SUPER_ADMIN is never limited. Sign-in and TOTP are not touched by this system.
- Archive and restore (services, packages, barbers): `lib/catalog/archive.js`; `archivedAt` and `archivedBy` fields; archived records are read-only and hidden everywhere; slugs stay reserved. Permanent delete is Super Admin only and not built yet (D2b).
- Booking: America/New_York, USD, 15-minute grid, 5-minute buffer, 60-minute lead, 30-day window, max 3 services, max 2 active bookings, 24-hour cancel cutoff, pay at the shop. Prices come from Mongo service records, never the client.
- Booking mail: `lib/mail/` (templates, calendar file, delivery log with idempotency and retry, `booking-mail.js`); entry point `lib/booking/notify.js`; docs/EMAIL.md; Email log at `/admin/email-log` (switches `emailLog.*`); preview at `/dev/email-preview` (development only).
- Reminder job: `/api/jobs/booking-reminders` (secret `REMINDER_JOB_SECRET`, `docs/REMINDERS.md`); toast CSS is allowed by two content hashes in `src/proxy.js` (a test recomputes them).
- Env variable NAMES only in `.env.example`; never open or print `.env`.

## Status (details in docs/PROJECT_STATUS.md)
847 tests (plus one opt-in live race test, skipped by default), lint and build clean at the last run. Built: Phases A to G, Phase I units I-1 to I-17, I-19, I-20, I-22, Cloudinary, pictures, Admin switch engine (39 switches, default deny), D2a archive and restore, Stage B QA fixes, Stage C booking emails, Stage D availability control (docs/AVAILABILITY.md: one availability function, timeBlock blocks, barber accepting bookings, service bookable, /admin/schedule; rule: nothing ever cancels or changes an existing booking). Live-tried: sign-in and TOTP, the permission switches, D2a, the QA audit of most admin screens, a real shop-notice email. Not verified live: the real Admin role on the Stage D switches, Complete and No-show (need a past booking), messages (none exist), a walk-in confirmation email, delivery of customer mail (needs a verified sender domain). Not started: D2b, I-23 to I-30, booking gaps (Stage E), offers, content manager, dashboard redesign, shop, deployment. `main` on GitHub holds all merged stages.

## Documentation (strict, every task)
Update docs/PROGRESS.md, root NEXT_TASK.md, docs/AI_HANDOFF.md ("Where I stopped"), this file and AGENTS.md when rules change, and the technical docs touched (SECURITY, ROLE_PERMISSIONS, ADMIN_PERMISSIONS, DATABASE, TESTING, DECISIONS, IMAGE_SLOTS). Document every new permission, route restriction and security rule. Say "not verified live" until it is. Report which docs changed.

## Git workflow (the owner does not use git; the assistant runs it)
- New work goes on a branch per round or unit (`feature/<name>`), created from an up-to-date `main` (clean tree, `git pull --ff-only`). After every unit: tests, lint, build, `git status`, `git diff --stat`, no secret-like file staged, separate commits with explicit `git add <paths>` and conventional messages, then push (`-u` the first time). At the end of a round, if checks pass: switch to main, `git pull --ff-only`, merge with `--ff-only` (or a merge commit if fast-forward is impossible and there is no conflict), push main, keep the old branch. Before any merge, tell the owner the commit id `main` is at now. After each git step report in 3 plain lines: what was saved, which branch, whether it is on GitHub. Never ask the owner to run git.

## Do not
- NEVER (git): force-push, reset --hard, clean, rebase, rewrite history, delete a branch or tag without asking, use `git add .` or `-A`, stage `.env`, secrets, `.claude`, `node_modules` or `.next`, push straight to main except by the merge step, or discard uncommitted work (checkout --, restore, stash drop). If a task needs one of these, stop and explain in plain words.
- Print secrets, drop or reset databases, add TypeScript, add parallel auth, start a unit without the owner's "ok", hardcode prices or colors in components, or use one-off CSS instead of tokens and shared components.
