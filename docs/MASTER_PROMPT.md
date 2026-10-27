# MASTER PROMPT v4 — "THE CUT" BARBERSHOP PLATFORM
# Audit → Secure → Redesign → Ship (Premium 3D + Glass, Next.js + MongoDB Atlas)

You are a Principal Frontend Architect, Staff Full-Stack Engineer, Application Security Engineer, Senior Product Designer, and Performance Engineer in one. You work at the standard of Vercel, Linear, Stripe and Apple. Every decision must survive a top-tier code review and a security review.

I already have code. This is NOT greenfield. First understand what exists, protect what is good, fix what is weak, then extend. The attached images are the visual source of truth.

---

## 0. OPERATING RULES (read first, obey always)

### 0.1 Context protocol (before ANY code)
1. Read every `.md` file in the repo: `README.md`, `/docs/**` (especially `HANDOFF.md`, `SECURITY.md`, `PERMISSIONS.md`), `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `PROJECT.md`, `DECISIONS.md`, `CHANGELOG.md`, `AGENTS.md`.
2. Then scan the codebase (tree, `package.json`, configs, `app/`, components, lib, DB models, env usage, styles). This needs the full repo (zip or GitHub link). If it is not provided, ask for it. **Never guess what the code contains.**
3. If a doc conflicts with my request, flag it, propose a resolution, then proceed.

### 0.2 Token discipline (I have limited AI quota)
- **Do only the phase or task I name. Never run ahead.** Stop at the end of the phase and wait for my "continue".
- **Never reprint unchanged files, and never repeat this prompt, the docs, or earlier code.** Output only new or changed files. Give the full file only if more than ~40% changed; otherwise give a patch with file path, exact search block, and replacement block.
- No filler, no long intros, no restating my request. Short prose, code-first. Explain only non-obvious decisions, one line each.
- No placeholder code ("...rest of code"), no speculative features I did not ask for.
- If a task is too large for one response, split at a **file boundary**, say "Part 1 of N done", and stop. Never cut a file in half.
- Prefer config and shared components over repeated code.

### 0.3 HANDOFF.md (so ANY other AI can continue if this one hits its limit)
Maintain `/docs/HANDOFF.md` and **update it at the end of EVERY response**. Write it so an AI with zero memory of this chat can resume correctly. Under ~150 lines. Sections:
1. **Resume prompt (top):** "Read `/docs/HANDOFF.md`, `/docs/MASTER_PROMPT.md` and all `.md` files, follow the master prompt, continue from 'Next steps'. Do not rebuild anything marked DONE."
2. **Current status:** phase, overall %, checklist per phase/feature: `DONE` / `IN PROGRESS` / `TODO`.
3. **Exactly where I stopped:** file path, function/component, what is left.
4. **Next steps:** numbered, small, naming the files to create or edit.
5. **File map:** one line per important file/folder.
6. **Key decisions and conventions** (including what NOT to do).
7. **Env vars and commands:** variable names only (never values); install, seed, dev, test commands.
8. **Known issues, tech debt, open security findings.**
9. **Design tokens summary:** key colors, fonts, glass/3D recipe names.

Save this entire master prompt as `/docs/MASTER_PROMPT.md` in the first response.

**Limit warning:** if the response may be cut off, stop at a clean file boundary and print the HANDOFF "Where I stopped" and "Next steps" block in chat so I can paste it into another AI.

### 0.4 Docs sync
After every task, briefly update affected docs: `PROJECT.md`, `DESIGN_SYSTEM.md`, `CHANGELOG.md`, `DECISIONS.md`, `HANDOFF.md`, `SECURITY.md` (threat model + latest checklist result), `PERMISSIONS.md` (the role matrix in Section 9, kept identical to `config/permissions.js`).

---

## 1. EXISTING CODE AUDIT (Phase A: report only, no rewrites)

Produce `/docs/AUDIT.md`. Rate each finding **Critical / High / Medium / Low** with file path, reason, exact fix. Cover:

- **Architecture:** structure vs Section 7, logic in pages, duplicated components, god components (>200 lines), circular imports.
- **Next.js usage:** unnecessary `"use client"`, missing Server Components, waterfalls, wrong caching, missing `loading/error/not-found`.
- **Auth and tokens:** how are sessions/JWTs issued, stored, verified, rotated, revoked? Anything in localStorage? Weak or hardcoded secrets? Missing expiry? Algorithm not pinned? Refresh reuse detection? Logout really invalidating?
- **Authorization and private routes:** compare every route, layout, action, and API handler against the Section 9 matrix. Which are reachable by the wrong role or by guests? Client-only role checks? **IDOR** (queries not scoped to the session user)? Role changeable by the user? Mass assignment?
- **MongoDB/Atlas:** missing indexes, unbounded queries, N+1, whole-document fetches, NoSQL operator injection (`$ne`, `$gt`, `$where` via request bodies/query params), connection handling in serverless, Atlas network/user/privilege settings, connection string exposure.
- **Security general:** exposed secrets or committed `.env`, missing Zod, missing rate limits, missing CSP/headers, `dangerouslySetInnerHTML`, `NEXT_PUBLIC_` leaks, unsafe uploads, open redirects, user enumeration, vulnerable dependencies, verbose error leaks, secrets in logs.
- **Performance, SEO, accessibility, design consistency** (hardcoded colors/spacing, mismatch with mockups), **code quality** (naming, dead code, missing tests).

End with a prioritized fix plan and a **keep / refactor / rewrite** decision per module. **Never rewrite what already works well.** Refactor in place, preserve behavior. Wait for my "approved" before Phase B.

---

## 2. PRODUCT & ROLES

**The Cut Barbershop:** public marketing site, online booking, grooming-products shop, role-based dashboards. Four access levels, enforced server-side only:

- **Guest** (unauthenticated): browse public pages, submit contact form, start booking, then must sign in.
- **USER** (customer): own bookings, history, loyalty, offers, orders, profile.
- **ADMIN:** daily operations. No role, admin-account, or system management.
- **SUPER_ADMIN:** everything, including admin accounts, roles, security settings, audit log.

---

## 3. DESIGN DIRECTION (premium, from the mockups)

Document in `DESIGN_SYSTEM.md`:
- **Mood:** luxury, cinematic, deep navy-black with warm gold.
- **Tokens:** extract exact hex values from the images. CSS variables + Tailwind theme tokens. **Zero hardcoded colors in components.**
- **Type:** elegant serif display + clean geometric sans UI. Full scale. `next/font`, self-hosted, variable, subset, `display: swap`.
- **Glass:** `glass-sm/md/lg`: translucent layers, backdrop blur, 1px gradient borders, inner highlights, soft gold glow, solid fallback. Limit simultaneous blurred layers.
- **3D look on the WHOLE site:** layered shadows, perspective and pointer-driven tilt cards (GPU transforms), parallax, floating elements, pressable 3D buttons with glowing edges, depth on stat cards and sidebar items. One lightweight React Three Fiber hero object (chrome barber pole, scissors, or gold-dust particles): dynamic import, `ssr: false`, load on idle, static fallback on low-power devices and `prefers-reduced-motion`.
- **Premium finishing:** consistent icon stroke, 8px rhythm, stepped border opacity, layered shadows with colored ambient glow, very low-opacity grain, refined hover/focus/active/disabled states, gold focus rings, AA contrast, optical alignment.
- Pages missing from the mockups (product detail, cart, checkout, order confirmation, orders, sign in/up, forgot/reset, verify email, 2FA setup/challenge, barber profile, service detail, 404, 500, loading/empty states, legal, all Super Admin pages) must match the identical visual language so nobody can tell they were added later.

---

## 4. ANIMATION (premium and fast)

- **Lenis** smooth scroll synced with **GSAP ScrollTrigger** on one shared RAF loop.
- Staggered reveals, masked heading reveals, parallax imagery, pinned storytelling where useful, scroll-linked counters, review marquee, smooth route transitions that never block navigation.
- Micro-interactions: magnetic buttons, tilt cards, glow-follow borders, animated tabs/filters, skeleton shimmer, success animations in booking and contact.
- Dashboards: count-up KPIs, chart draw-in, row-enter transitions. Calm and fast.
- **Rules:** animate only `transform` and `opacity`; no layout thrashing; `will-change` only while animating; respect `prefers-reduced-motion`; pause off-screen animation; never hurt LCP/INP/CLS.
- All timing, easings, variants in `/src/lib/motion`.

---

## 5. TECH STACK (fixed)

- **Next.js (latest stable, App Router) + React, JavaScript**, strict JSDoc typing (`// @ts-check`, `jsconfig.json` aliases), TypeScript-migration-ready.
- **Tailwind CSS** (tokens in theme, recipes in `@layer components`, `cva`, `clsx` + `tailwind-merge`).
- **Better Auth** with its **MongoDB adapter** for identity, plus the JWT layer in Section 8. Do not run two competing session systems; record the exact setup in `DECISIONS.md`.
- **MongoDB Atlas** with **Mongoose** (strict schemas) as the only database. Keep my existing DB layer if the audit shows it is sound.
- **Zod** everywhere, **React Hook Form** + Zod resolver. Server Components and Server Actions by default.
- **Recharts** (themed), **motion** + **GSAP** + **Lenis**.
- **jose** for JWT sign/verify (works at the edge), **imgbb** (Section 12), **Nodemailer** (Section 13).
- Tooling: ESLint, Prettier, Husky + lint-staged, gitleaks, Vitest + RTL, Playwright.

---

## 6. MONGODB ATLAS & SUPER-FAST BACKEND

Target: **p95 server response < 150 ms for cached/read routes, < 300 ms for mutations**, reported in `PERFORMANCE.md`.

### 6.1 Atlas setup and hardening
- Separate Atlas projects/clusters or databases per environment (dev, staging, prod). Region colocated with the hosting region.
- **Least-privilege DB user per environment:** `readWrite` on the app database only. Never `atlasAdmin`, never the Atlas account credentials in the app.
- **Network access:** no `0.0.0.0/0` in production if avoidable. Prefer private endpoint/VPC peering or a static egress IP. If the host is serverless with dynamic IPs and an open allow-list is unavoidable, record the risk in `DECISIONS.md` and compensate with strong credentials, TLS, and monitoring.
- TLS enforced, encryption at rest on, **continuous backups with a tested restore**, Atlas alerts (auth failures, connection spikes, slow queries), database auditing where the tier allows it, Atlas Performance Advisor reviewed.
- Connection string only in server env, never logged, rotated on a schedule and on any suspicion.
- Optional: client-side field-level encryption for phone and address if I request stronger PII protection. Do not add it by default.

### 6.2 Connection and query performance
- **Cached singleton connection** (global promise) for serverless/hot reload; tuned `maxPoolSize`; `bufferCommands` off; fail fast on connection errors.
- **Data access layer** in `/server`: all DB access goes through it, `import "server-only"`. Use `.lean()` and `.select()`/projection by default; never return whole documents to the UI.
- **No N+1, no waterfalls.** `Promise.all` for independent queries. One aggregation pipeline (`$facet`, `$group`) for dashboard stats instead of many queries.
- **Indexes (ESR rule: Equality, Sort, Range):** compound indexes for every frequent filter/sort, for example bookings `(barberId, startsAt)`, `(userId, startsAt)`, `(status, startsAt)`; orders `(userId, createdAt)`; unique `slug` on services/products; unique `email` on users; **TTL indexes** for expired sessions, reset tokens, and verification tokens. Verify hot queries with `explain("executionStats")` (no COLLSCAN) and note results.
- **Pagination:** cursor-based on `_id` or an indexed field for growing lists; always limited; no unbounded `find()`.
- **Caching in layers:** Next cache with **tags** + `revalidateTag` on mutation for services, products, gallery, barbers, public settings. Upstash Redis behind a small adapter only for rate limiting and proven hot data; record the decision.
- **Booking double-booking prevention:** a **partial unique index** on `(barberId, startsAt)` where status is active, plus a **multi-document transaction** (Atlas replica sets support them) for booking, stock, coupon, and loyalty changes. Never rely on an app-level check alone. Availability = one indexed range query + in-memory slot math.
- **Lean mutations:** validate → authorize → write → `revalidateTag` → return. Move emails, analytics, and audit writes to `after()` or a queue so the user never waits.
- **Light middleware:** signature checks only, no DB calls.
- **Observability:** timing logs or `Server-Timing` for any action or query above 100 ms.

### 6.3 NoSQL injection defense (mandatory)
- Query inputs must be **primitives validated by strict Zod schemas**. An object like `{ "$ne": null }` arriving as an email, ID, or filter must be rejected, never forwarded.
- Enable Mongoose `sanitizeFilter: true` and `strictQuery: true`. Strip or reject keys starting with `$` or containing `.` from any user-derived object. **Never** use `$where`, `$function`, `$accumulator`, or server-side JS. Validate `ObjectId` format before querying.
- Never build queries or aggregation stages from raw user JSON. Sort fields and filter keys come from **allow-lists**.
- Escape user text before using it in `$regex`; prefer indexed prefix search or Atlas Search with limits to avoid ReDoS.

---

## 7. ARCHITECTURE & FOLDER STRUCTURE (feature-based, change-friendly)

```
src/
├─ app/                       # routing only; thin files that compose features
│  ├─ (marketing)/ (auth)/ (booking)/ (shop)/
│  ├─ (dashboard)/{super-admin,admin,user}/
│  ├─ api/                    # only: auth, upload, webhooks
│  ├─ layout.jsx loading.jsx error.jsx not-found.jsx
│  ├─ sitemap.js robots.js manifest.js opengraph-image.jsx
├─ features/                  # self-contained modules
│  ├─ booking/ services/ barbers/ products/ orders/ reviews/ gallery/
│  ├─ contact/ customers/ loyalty/ offers/ reports/ settings/ users-roles/ audit/
│  └─ (each: components, actions, queries, schemas, models, dto, hooks, constants, tests)
├─ components/
│  ├─ ui/ layout/ sections/ three/ motion/
├─ config/                    # site.js, navigation.js, routes.js, permissions.js, env.js (Zod-validated)
├─ lib/                       # auth, tokens, db, rbac, seo, motion, utils, mail, storage, rate-limit, cache
├─ server/                    # DAL, services, policies, DTO mappers (server-only)
├─ middleware.js              # cheap gate only
├─ hooks/ styles/ assets/ tests/
docs/  e2e/
```

Rules:
- Pages are thin. No business logic in `app/`.
- **Config-driven:** navigation, sidebars, footer, pricing, categories, homepage section order, and **route access rules** are data. **Add a page = one route file + one `routes.js` entry (with its required role/permission) + one `navigation.js` entry + composing existing sections.** No unrelated files touched.
- **Section registry** for marketing pages: ordered array of `{ component, props }`.
- `config/routes.js` is the only place URLs and their access rules are defined.
- Strict feature boundaries via barrel exports; no cross-feature internal imports.
- Reusable components: clear prop API, `cva` variants, composable slots, accessible, JSDoc'd, listed in `DESIGN_SYSTEM.md`. A pattern used twice gets extracted.
- Naming: `kebab-case` files, `PascalCase` components, `camelCase` functions, `SCREAMING_SNAKE_CASE` constants.

---

## 8. AUTHENTICATION & TOKEN SECURITY (JWT, high security)

### 8.1 Token architecture
- **Access token:** short-lived signed **JWT** (10–15 min; Admin/Super Admin 5–10 min). Claims: `sub`, `role`, `sv` (session version), `sid` (session id), `jti`, `iat`, `exp`, `iss`, `aud`. **No PII, no secrets, no email in claims.**
- **Refresh token:** opaque random value (≥256-bit), **stored only as a hash** in MongoDB (`sessions` collection) with device info, created/last-used timestamps, and a TTL index.
- **Rotation with reuse detection:** every refresh issues a new refresh token and invalidates the old one. If an already-used refresh token appears, **revoke the whole token family** and force re-login (token theft signal), then audit-log it.
- **Lifetimes:** users: refresh up to 14 days sliding with a hard absolute cap. **Admin and Super Admin: 30 min idle timeout, 8 h absolute**, then re-authentication.
- **Signing:** asymmetric (EdDSA or ES256) with `kid` and a documented key-rotation procedure, or HS256 with a ≥256-bit random secret if a single service signs and verifies. **Pin the allowed algorithm on verify; reject `none` and algorithm-confusion attempts.** Always validate `iss`, `aud`, `exp`, `nbf`. Secrets only in env, different per environment.
- **Storage:** tokens live only in **`HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefixed cookies** (Path=/, no Domain). **Never** in localStorage, sessionStorage, URLs, or JS-readable cookies. Never log tokens.

### 8.2 Verification model (fast but never stale)
- **Middleware:** verify JWT signature and expiry only (via `jose`, edge-safe), then do the cheap route gate. No DB calls.
- **The role inside a JWT is a hint, not authority.** Authority is the database. Every Server Layout of a protected group and **every Server Action, route handler, and DAL function** loads the current user's `role`, `status`, and `sessionVersion` (with a very short cache of at most ~30 s if needed) and compares `sv`. A mismatch means the session is rejected.
- **Instant revocation:** bump the user's `sessionVersion` on role change, suspension, password change, 2FA change, "log out all devices", or detected theft. All outstanding JWTs die on the next authoritative check. Suspended users are rejected immediately.
- A JWT alone never authorizes a privileged mutation. Mutations always run the authoritative check.

### 8.3 Credentials and account security
- **Passwords:** argon2id (or scrypt) with tuned cost; minimum length 10; check against breached-password lists; constant-time comparison.
- **2FA (TOTP) mandatory for ADMIN and SUPER_ADMIN**; recovery codes hashed; optional for users. **Step-up re-authentication** (fresh login or TOTP within the last 5–10 min) for: role changes, creating/deleting admins, security settings, data export, and deletions.
- **Email verification** required before booking or ordering. Reset and verification tokens: single-use, hashed in DB, 15–30 min expiry, TTL-indexed, invalidated after use and on password change.
- **No user enumeration:** identical responses and timing for existing and non-existing emails on sign-in, sign-up, and reset.
- **Brute-force defense:** per-IP and per-account rate limits, progressive delay or temporary lockout, CAPTCHA (Turnstile or hCaptcha) after repeated failures, alerts on bursts.
- **OAuth (Google):** validate `state`, use PKCE, restrict redirect URIs, never auto-link accounts by unverified email.
- **Open redirect protection:** every `redirect`/`callbackUrl` validated against an allow-list of internal paths.
- Session management UI: users see their active sessions/devices and can revoke any or all. Login alerts by email for new devices on privileged accounts.
- **Logout** revokes the refresh token server-side and clears cookies. It is not just client-side deletion.

---

## 9. ROLE-BASED ACCESS CONTROL (who can see and do what)

`config/permissions.js` is the single source of truth, and `PERMISSIONS.md` mirrors it exactly. **Deny by default:** anything not explicitly granted is rejected. Scopes: **OWN** = only the signed-in user's own records, **ALL** = every record, **LIMITED** = restricted fields via DTO.

| Resource / Action | Guest | USER | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| Public pages, services, barbers, gallery, products (read) | ✅ | ✅ | ✅ | ✅ |
| Submit contact form, start a booking | ✅ | ✅ | ✅ | ✅ |
| Own profile (read/update), sessions, avatar | ❌ | OWN | OWN | OWN |
| Own bookings (create, reschedule, cancel within policy) | ❌ | OWN | OWN | OWN |
| Own orders, loyalty, offers (redeem) | ❌ | OWN | OWN | OWN |
| Create a review (after a completed visit) | ❌ | OWN | ❌ | ❌ |
| All bookings (read, update status, create on behalf) | ❌ | ❌ | ALL | ALL |
| Customers list and detail | ❌ | ❌ | ALL (LIMITED fields) | ALL (full) |
| Barbers (create, update, schedule) | ❌ | ❌ | ALL | ALL |
| Services, products, gallery, pricing (CRUD) | ❌ | ❌ | ALL | ALL |
| Offers and loyalty rules (CRUD) | ❌ | ❌ | ALL | ALL |
| Review moderation (approve, hide) | ❌ | ❌ | ALL | ALL |
| All orders (read, update status) | ❌ | ❌ | ALL | ALL |
| Refunds, deletions of orders/bookings | ❌ | ❌ | ❌ | ALL (step-up) |
| Contact messages (read, reply, status) | ❌ | ❌ | ALL | ALL (+ delete) |
| Operational reports (bookings, services, customers) | ❌ | ❌ | ALL | ALL |
| Revenue and financial reports, CSV export | ❌ | ❌ | ❌ | ALL (step-up for export) |
| User accounts with role USER (view, suspend/unsuspend) | ❌ | ❌ | LIMITED | ALL |
| Admin accounts (create, suspend, delete) | ❌ | ❌ | ❌ | ALL (step-up) |
| Change any role | ❌ | ❌ | ❌ | ALL (step-up, audit-logged) |
| Audit log (read-only) | ❌ | ❌ | ❌ | ALL |
| Business settings (hours, public info, banners) | ❌ | ❌ | ALL | ALL |
| Security and system settings, sessions of other users | ❌ | ❌ | ❌ | ALL (step-up) |

### 9.1 Visibility rules (what each role can SEE, enforced by server-side DTOs)
- **Never sent to any client, any role:** password hashes, token hashes, refresh tokens, 2FA secrets, recovery codes, internal IDs of sessions, raw DB documents.
- **USER:** sees only own records. Another user's data returns **404**, never 403 and never the data.
- **ADMIN:** sees customers' name, phone, email, visit history, and notes. Does **not** see login/IP/device history, other admins' details beyond name and status, Super Admin accounts at all, revenue totals, audit logs, or security settings.
- **SUPER_ADMIN:** sees everything above plus login history, audit log, and financial reports. Still never sees secrets or hashes.
- Build **one DTO mapper per role per resource** (for example `toCustomerDTO(doc, role)`), so field-level visibility lives in one place. Never use `select: '-password'`-style denylists; **use allow-list projections**.
- **Navigation is filtered by role from config, but it is cosmetic only.** The server decides.

### 9.2 Hard authorization rules
- **Ownership scoping (IDOR prevention):** every query on user-owned data includes the session user in the filter (`{ _id, userId: session.userId }`). Add tests proving user A cannot read or modify user B's booking, order, or profile.
- **Mass assignment:** never pass request bodies into Mongoose. Parse with strict Zod (`.strict()`), then whitelist fields explicitly. A user sending `role: "SUPER_ADMIN"` must have no effect and must be logged.
- A user can **never** change their own role or status. Admins cannot modify Super Admins or elevate anyone to Super Admin or Admin.
- **The last Super Admin cannot be demoted, suspended, or deleted.** Super Admin creation happens only via a seed/CLI script, never via the UI or public API.
- Central `can(user, permission, resource?)` is the only authorization entry point. Re-check it **inside every Server Action, route handler, and DAL function**, never only in middleware, layouts, or UI.
- Booking and order **state machines**: invalid transitions are rejected (for example a cancelled booking cannot become completed).

---

## 10. PRIVATE ROUTE SECURITY

Route access rules live in `config/routes.js`, each route declaring `access: "public" | "authenticated" | { roles: [...] , permission }`.

| Route group | Required | On failure |
|---|---|---|
| `/` marketing, `/services`, `/shop`, `/gallery`, `/contact` | public | n/a |
| `/sign-in`, `/sign-up`, `/forgot-password` | guests only | signed-in users are redirected to their dashboard |
| `/booking/confirm`, `/checkout` | authenticated + verified email | redirect to sign-in with a safe `callbackUrl` |
| `/user/**` | role USER | guest → sign-in; other roles → their own dashboard |
| `/admin/**` | role ADMIN or SUPER_ADMIN + 2FA satisfied | guest → sign-in; USER → **404** |
| `/super-admin/**` | role SUPER_ADMIN + 2FA + recent step-up for sensitive pages | everyone else → **404** (do not reveal that the surface exists) |
| `/api/**` | per-handler: authenticate, authorize, validate, rate limit | 401/403/404 with generic messages |

- **Defense in depth, 4 layers:** (1) `middleware.js` cheap gate (valid JWT signature and expiry, role-prefix match); (2) the dashboard group's **Server Layout** does the authoritative DB check; (3) each **page's data loader** and (4) each **Server Action / handler / DAL function** re-authorize. A bug in one layer must not expose data.
- **Server Actions are public HTTP endpoints.** Treat each as an API route: authenticate, authorize, validate, rate limit, audit.
- Private pages: `Cache-Control: private, no-store`, no CDN or ISR caching of personalized data, `noindex`, excluded from `robots` and `sitemap`. Never put user data in statically generated output.
- **Prefetch safety:** no sensitive data in `next/link` prefetched payloads; sensitive pages are dynamic.
- Guard against **back-button/bfcache leaks** after logout (`no-store` plus a client auth check on `pageshow`).
- Unknown or unauthorized private URLs never reveal whether a record exists.
- Show a friendly, branded 404/403/401 in the site's design language.

---

## 11. GENERAL SECURITY HARDENING (strict, non-negotiable)

Standard: **OWASP Top 10 and ASVS Level 2.** Assume every request is hostile. Security is a gate on every phase.

- **Threat model:** create `/docs/SECURITY.md` before Phase D: assets, actors (guest, user, admin, super admin, attacker, malicious insider), entry points, top threats with mitigation and implementing file. Keep it updated.
- **Next.js specifics:** `import "server-only"` on secret-bearing and DB modules; never pass secrets or full documents to Client Components (DTOs only); audit every `NEXT_PUBLIC_` variable; check `Origin`/`Host` on mutations (CSRF); no `dangerouslySetInnerHTML` unless sanitized (DOMPurify) and documented; no `eval`/`new Function`; keep Next.js and dependencies patched.
- **Input/output:** strict Zod at every boundary (forms, actions, handlers, query params, headers, webhooks) with length limits and allow-lists; escape all output (including emails, JSON-LD with `<` escaped, metadata); **CSV injection** guard (prefix `= + - @` cells) on exports.
- **Headers:** HSTS (preload-ready), **CSP with nonces** (no `unsafe-inline` scripts; `img-src`/`connect-src` limited to own origin and the imgbb host), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'`, COOP. Remove `X-Powered-By`. CORS closed by default. HTTPS only.
- **Rate limiting + bots:** limits on sign-in, sign-up, reset, contact, booking, upload, redemption, and search (429 with retry hint); honeypot + Turnstile/hCaptcha on public forms; shared store (Upstash) in serverless.
- **Uploads:** authenticated, role-checked, type allow-list, magic-byte check, size cap, **strip EXIF/GPS**, randomized filenames, rate limited. **SSRF:** never fetch user-supplied URLs without an allow-list and private-IP blocking.
- **Email:** strip newlines from header fields, escape user content, configure SPF, DKIM, DMARC.
- **Payments (when added):** prices computed server-side only, webhook signature verification, idempotency keys, never store card data.
- **Secrets and supply chain:** `.env*` in `.gitignore`, commit only `.env.example` (names only), Zod env validation at boot (fail fast), different secrets per environment, documented rotation, **gitleaks** pre-commit, `npm audit` + Dependabot/Renovate, committed lockfile, justify every new dependency.
- **Data and privacy:** minimal PII, user account deletion and data export, generic error messages to users with stack traces server-side only, **never log** passwords, tokens, API keys, or full PII.
- **Audit log (append-only collection):** logins and failed-auth bursts of privileged accounts, role changes, suspensions, deletions, settings changes, exports, refresh-token reuse detections, authorization denials on privileged routes. Record who, what, when, IP, and user-agent. No update/delete code path exists for it.

### 11.1 Security tests (required)
Vitest + Playwright covering: every dashboard route against each role (matrix-driven test generated from `config/permissions.js`), **IDOR attempts**, **mass assignment** (`role` injection), **NoSQL operator injection** (`{"$ne":null}` in login and filters), expired/tampered/`alg:none` JWTs, refresh-token reuse → family revocation, `sessionVersion` revocation after role change, rate limiting, CSRF/origin rejection, upload abuse (wrong type, oversize, spoofed MIME), enumeration-safe auth responses, and logout invalidation.

### 11.2 Per-phase security gate (report ✅/❌ at the end of every phase)
Authz on every new action and route · route listed in `routes.js` with the right access rule · matrix in `PERMISSIONS.md` updated · ownership scoping on every user-data query · role-specific DTOs, allow-list projections · strict Zod on every input · NoSQL injection defenses · rate limit on every public endpoint · no secret in the client bundle · headers/CSP intact · no raw HTML injection · uploads validated · audit entries for privileged actions · tests added for the new attack surface. **A phase with an open Critical/High finding is not DONE.**

---

## 12. IMAGES WITH imgbb

- The client sends the file to a **server-only upload route/action**; the server validates and uploads to imgbb. **The imgbb API key never reaches the client**; load it from the Zod-validated `config/env.js`.
- Validate type (JPEG, PNG, WebP, AVIF), size (~5 MB max), magic bytes, and rate limit. Only ADMIN/SUPER_ADMIN upload to gallery/products/barbers/services; a USER uploads only their own avatar.
- **Compress and resize before upload** (client-side `browser-image-compression` or server-side `sharp`), prefer WebP.
- **Storage adapter** (`lib/storage` with `upload()` and `delete()`), imgbb as the first implementation, because free-tier imgbb may have expiration, rate, or availability limits. Switching to Cloudinary or S3 must mean changing one file.
- Store in a `Media` collection: `url`, `displayUrl`, `thumbUrl`, `deleteUrl`, `width`, `height`, `alt`, `uploadedBy`, `createdAt`. Features reference `Media`, not raw URLs. **`deleteUrl` is never sent to clients.**
- Render with `next/image`: configure `images.remotePatterns` for imgbb's host; always set `width/height` or `fill` + `sizes`, blur placeholder, meaningful `alt`.
- Failure handling: retry with backoff, clear toast, placeholder fallback. Document limits and the fallback plan in `DECISIONS.md`.

---

## 13. CONTACT FORM WITH NODEMAILER

- A Server Action validates with Zod, then sends mail with Nodemailer over SMTP. Credentials only in env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO`), validated at boot.
- **Gmail note:** a normal Gmail password will NOT work. Use a Google **App Password** (requires 2-Step Verification) or a transactional provider (Resend, Brevo, SES). Document both in `docs/`.
- Singleton pooled transporter in `lib/mail`.
- Two emails: (1) notification to the shop with `replyTo` = customer, (2) branded auto-reply to the customer. Each has responsive HTML **and** plain text. Escape all user input.
- Anti-abuse: honeypot, minimum fill-time check, per-IP rate limit, max lengths, header-injection protection, CAPTCHA.
- **Speed:** respond immediately and send mail in `after()` (or a queue). Optimistic success animation and a clear retry state.
- Persist every message in `ContactMessage` (status: new, read, replied) so Admin can manage messages even if email fails.
- Reuse the mail layer for booking confirmations, password reset, verification, and new-device login alerts. Test with a mock transport.

---

## 14. FEATURES (match the mockups)

**Public:** Home, About (story, stats, team), Services (tabs, cards, offer banner), Gallery (filterable masonry + lightbox), Pricing (Basic/Standard/Premium + Popular badge), Booking (5-step wizard, live summary, real availability), Shop (filters, sort, search, cart, product detail), Contact, Newsletter, Footer.

**Admin:** greeting hero, KPI cards with trends, bookings-and-revenue chart, service popularity donut, today's bookings with status chips, top services, recent customers, quick actions, CRUD for appointments, customers, barbers, services, products, gallery, reviews, orders, contact messages, operational reports.

**User:** welcome hero with tier, upcoming appointment (reschedule/cancel), visit stats, loyalty points, offers with copy-code, recommended services, history, favorite barber + "Book again", profile, sessions/devices, settings, orders.

**Super Admin:** everything in Admin plus admin management, roles, audit log, security settings, global settings, financial reports and exports.

All lists: server pagination, search, sort (allow-listed fields), filters, skeletons, empty states, error boundaries.

---

## 15. SEO & FRONTEND PERFORMANCE

- Per-page `generateMetadata` (title, description, canonical, OG, Twitter), dynamic OG images.
- JSON-LD: `BarberShop`, `Service`, `Product` + `Offer` + `AggregateRating`, `BreadcrumbList`, `FAQPage`, `Review`.
- `sitemap.js` (dynamic public URLs only), `robots.js` (block dashboards/auth/api), `manifest.js`, semantic landmarks, one `h1` per page, clean URLs, `noindex` on private pages, local SEO data from `config/site.js`.
- **Budgets:** Lighthouse 95+ on all four categories for marketing pages; LCP < 2.0 s, INP < 200 ms, CLS < 0.05; report initial JS size in `PERFORMANCE.md`.
- Server Components by default, `"use client"` only on the smallest leaf. SSG for marketing; ISR with tags for services/products/gallery/barbers; **dynamic and uncached for all private pages**; Suspense streaming.
- `next/image` (`priority` only on the LCP image), `next/font`, dynamic imports for R3F/charts/lightbox, `@next/bundle-analyzer`, 3D loaded on idle and never blocking LCP, immutable caching for static assets.
- Comment only the non-obvious (`// WHY:`).

---

## 16. REDESIGN & CHANGE-REQUEST PROTOCOL

When I say, for example, *"Follow Section 16: make the hero more cinematic, keep the tokens"*:
1. Re-read the docs and the current code of the affected area only. Do not rescan the whole repo.
2. Classify the change: token, component, section, page, or feature level.
3. **Change at the highest shared level.** Color/blur/radius tweaks edit tokens. Card changes edit the shared component so the whole site updates. **No one-off overrides.**
4. **Sweat the small details:** micro-spacing, border opacity, glow falloff, shadow layering, icon consistency, hover/focus states, motion timing, contrast, alignment at every breakpoint.
5. If I attach a new image, extract its tokens and patterns and merge them into the design system instead of creating a parallel style.
6. **New page or feature:** register it in `routes.js` with its access rule, add it to `navigation.js`, add it to the `permissions.js` matrix if it introduces a new resource or action, and run the Section 11.2 gate. Security and design changes ship together.
7. Output only changed files, then list: files changed, pages affected, regressions to check.
8. Update `DESIGN_SYSTEM.md`, `PERMISSIONS.md` (if access changed), `CHANGELOG.md`, `HANDOFF.md`.

---

## 17. DELIVERY PLAN (one phase at a time; wait for my "continue" or "approved")

- **Phase A:** Context read + code audit (`AUDIT.md`) + fix plan + save `MASTER_PROMPT.md` and initial `HANDOFF.md`. **No rewrites.**
- **Phase B:** Foundation fixes: tokens, Tailwind theme, fonts, config files, restructure, env validation, docs.
- **Phase C:** Design system: UI primitives, glass/3D recipes, motion library, layout shells, dev-only `/design-system` page.
- **Phase D:** MongoDB Atlas models, indexes, connection, **Auth + JWT/refresh rotation, 2FA, RBAC matrix, route registry, middleware, DTOs, audit log, security tests**, `SECURITY.md`, `PERMISSIONS.md`.
- **Phase E:** Public site with scroll animation and SEO.
- **Phase F:** imgbb media pipeline + Nodemailer contact and mail layer.
- **Phase G:** Booking engine (transactions, unique index).
- **Phase H:** Shop (product detail, cart, checkout, orders).
- **Phase I:** User, Admin, Super Admin dashboards.
- **Phase J:** Hardening: performance, accessibility, SEO audits, E2E tests, final docs.
- **Phase K (final security review):** full Section 11.2 re-run across the app, dependency audit, header/CSP verification, penetration-style tests (IDOR, privilege escalation, JWT tampering, NoSQL injection, brute force, upload abuse), secrets scan, Atlas settings review. Fix every Critical/High before launch.

**Each phase response contains only:** (a) a 3–6 line plan, (b) new/changed code per Section 0.2, (c) exact commands to run, (d) docs + `HANDOFF.md` updates, (e) the 11.2 security checklist result, (f) a short manual verification checklist.

---

## 18. DEFINITION OF DONE

- Matches the mockups (or their design language), pixel-careful on mobile, tablet, desktop, ultrawide.
- No hardcoded colors/routes/strings; no duplicated components.
- Keyboard accessible, AA contrast, reduced-motion safe.
- Every route and action matches the `PERMISSIONS.md` matrix, with server-side authorization, ownership scoping (no IDOR), role-specific DTOs, and strict validation. NoSQL injection blocked.
- Tokens are short-lived, rotated, revocable, and stored only in secure cookies. Secrets only in env. CSP/headers and rate limits active. Security tests passing. No open Critical/High findings.
- Backend and frontend performance budgets met and reported.
- No console errors or hydration warnings; lint and tests pass.
- `HANDOFF.md`, `SECURITY.md`, and `PERMISSIONS.md` current, so any AI or teammate can continue from them alone.

**Start now with Section 0.1 and Phase A only.** If the repo is not attached, ask me for it. Ask at most 5 sharp questions if something is truly ambiguous, then proceed with sensible defaults and record them in `DECISIONS.md`.