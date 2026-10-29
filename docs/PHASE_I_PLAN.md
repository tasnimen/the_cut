# Phase I plan: dashboards (user, admin, super admin)

**Goal:** control everything from dashboards, with real MongoDB data (no fake numbers, proper empty states). Look: `docs/design/deshboard.png` (admin and user), design tokens and shared components only. Each unit below is proposed and waits for the owner's "ok". Cost: S = small, M = medium, L = large.

**Facts that shape the plan**
- Admin and Super Admin sessions already require TOTP enrolment (`requirePrincipal`), so a TOTP enrolment/verify screen is needed before any admin page can work (unit I-3).
- Public data (services, prices, packages, barbers, hours, holidays, contact, images) lives in files today (`booking-services.js`, `pricing-packages.js`, `booking.js`, `site.js`, `images.js`); Mongo holds `service` and `barber` (seeded). The DB-with-file-fallback layer is built in part B, before the admin CRUD screens.
- Booking API already has `cancel`, `reschedule` and `no-show` routes; no UI yet.
- Route names follow the owner's brief: `/user`, `/admin`, `/super-admin` (the planned `/dashboard...` entries in `config/navigation.js` will be renamed).
- Dev database only for seeds and live tests. Passwords come from env variable names set by the owner; never printed.

## Part A: foundation

| Unit | What | Cost |
|---|---|---|
| I-1 | Routes and guards: `/user`, `/admin`, `/super-admin` in `config/routes.js` with role rules; route-group layouts with server guards (404 for unauthorized), `no-store`, `noindex`; role-aware redirect after sign-in; `can()` helper that every action re-checks | M |
| I-2 | Dashboard shell: sidebar, topbar, breadcrumbs, mobile drawer, loading, error and empty-state components, KPI/table/card primitives in the mockup style; account-menu links switched on | M |
| I-3 | TOTP enrolment and challenge pages for ADMIN/SUPER_ADMIN (needed to open admin pages) | M |
| I-4 | Seed script: first SUPER_ADMIN and a test ADMIN from env variable names, dev database only, no password logging | S |

## Part B: public data from MongoDB (with file fallback and tag revalidation)

| Unit | What | Cost |
|---|---|---|
| I-5 (done 2026-10-29) | Data layer pattern: repository functions with file fallback, cache tags, `revalidateTag` on save; start with services and pricing packages (public pages read from it) | M |
| I-6 (done 2026-10-29) | Barbers (public profile) and holidays/closed dates into the layer | M |
| I-7 (done 2026-10-29; includes the closed-dates editor planned for I-18) | Business settings (opening hours, contact details, social links) feeding `config/site.js` data | M |

## Part C: user dashboard (`/user`)

| Unit | What | Cost |
|---|---|---|
| I-8 (done 2026-10-29) | Overview, upcoming appointment with reschedule and cancel (24-hour rule), visit history | M |
| I-9 (done 2026-10-29) | Profile edit, change password, active sessions list with revoke | M |
| I-10 (done 2026-10-29, live upload not verified) | Avatar upload (ImgBB, own avatar only) and account deletion request | M |

## Part D: admin dashboard (`/admin`)

| Unit | What | Cost |
|---|---|---|
| I-11 (done 2026-10-29, admin screen not exercised live) | Today's bookings with status changes (confirm, complete, no_show, cancel) | M |
| I-12 (done 2026-10-29, admin screen not exercised live) | All bookings: search, filter, pagination | M |
| I-13 | Walk-in booking | M |
| I-14 | Customers list (limited fields) | S |
| I-15 (done 2026-10-29, image field deferred to the image-slot work in I-27) | Services CRUD (name, price, duration, active, order) | M |
| I-16 (done 2026-10-29) | Pricing packages CRUD | S |
| I-17 (done 2026-10-29; photo upload deferred to the image-slot work in I-27) | Barbers CRUD with schedule editor | L |
| I-18 | Holidays and closed dates, business settings UI | M |
| I-19 | Gallery manager (ImgBB upload and delete) | M |
| I-20 | Contact messages (read, replied, delete) | S |
| I-21 | Review moderation (only if reviews exist; otherwise skipped) | S |
| I-22 | Operational reports with real aggregates | M |

## Part E: super admin (`/super-admin`)

| Unit | What | Cost |
|---|---|---|
| I-23 | Admin accounts (create, suspend), role changes with `requireRecentStepUp`, last SUPER_ADMIN protected | L |
| I-24 | Audit log viewer (read-only, filters, pagination) | M |
| I-25 | Security settings (rate-limit and session policy view, email-verification flag status) | S |
| I-26 | Revenue reports and CSV export (formula-safe cells) | M |
| I-27 | Image slot overrides (`config/images.js` to Media records) | M |

## Part F: hardening and deferred live tests

| Unit | What | Cost |
|---|---|---|
| I-28 | Role-specific DTOs (Admin never sees Super Admin accounts, login/IP history or revenue totals), IDOR and role-matrix tests, `docs/PERMISSIONS.md` and `docs/SECURITY.md` | M |
| I-29 | Live media tests with real USER and ADMIN sessions (allowed and denied) and a live ImgBB upload | M |
| I-30 | Barber schedules entered by the owner, then Atlas booking race tests from `docs/TESTING.md` | M (needs owner data) |

**Approved order (owner, 2026-10-29):** Round 1 = I-4, I-1, I-2, I-3. Round 2, "control the data myself" = I-5, I-15, I-16, I-6, I-17, I-7. Then bookings and the user dashboard (I-8 to I-14, with I-11, I-12 and I-13 first), then the rest of Admin (I-18 to I-22), then Super Admin (I-23 to I-27), then hardening (I-28 to I-30). Each unit still waits for the owner's ok.

**Rules for every unit:** per-action role check (`can()`), ownership scoping, strict Zod, mass-assignment protection, rate limits, an audit event for every privileged change, no fake data, empty states, no secrets in the client.
