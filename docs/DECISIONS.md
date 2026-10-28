# Decisions and open questions

**Status: implementation decisions recorded through the Phase D foundation.**

| Topic | Current direction | Decision status |
|---|---|---|
| Language | JavaScript/JSX only | User-mandated |
| Frontend | Existing Next App Router project | Accepted; preserve current repo layout |
| Server/backend | Next.js Server Actions for mutations and Route Handlers for explicit HTTP endpoints | User-selected; no separate Express server |
| Database | MongoDB Atlas via direct MongoDB driver, server-only; Better Auth Mongo adapter shares its client | Foundation implemented; Atlas deployment/credentials and business schemas TBD |
| UI foundation | Existing components and Tailwind 4 theme; add dependencies only for a scoped need | Accepted for Phase B; no UI kit added |
| UI variants | `class-variance-authority`, `clsx`, and `tailwind-merge` for shared primitive variants | Added in Phase C; no replacement UI kit |
| Motion | `motion`, GSAP + ScrollTrigger, and Lenis; shared ticker and reduced-motion handling | Added in Phase C; visual effects are deferred and scoped |
| 3D | `three` + `@react-three/fiber` for a minimal gold dust hero accent | Added in Phase C; one idle-loaded, in-view canvas with static fallback |
| Design palette | CSS tokens in `src/styles/tokens.css`, mapped to Tailwind 4 theme variables | Implemented in Phase B; based on existing code/reference read, not exact sampled source values |
| Fonts | Cormorant Garamond display + Manrope UI through `next/font/google` self-hosting | Implemented in Phase B; Latin subset and `display: swap` |
| Runtime config | Zod schema in server-only `src/config/env.js`; site, MongoDB, Better Auth values | Implemented; service secrets are required when their server modules initialize |
| Public routes | `/`, `/about`, `/services`, `/gallery`, `/pricing`, `/booking`, `/contact`; `/shop` deferred | Public slugs registered centrally. About copy, Gallery photos, pricing, contact details, and Shop catalog remain unverified or unimplemented. |
| Authentication | Better Auth only; supported Next.js Route Handler + MongoDB adapter + TOTP | Use Better Auth's revocable DB-backed session for this same-origin app; no parallel JWT/refresh session system. `/sign-in` and `/sign-up` call the same-origin API; token fields are stripped from JSON while the HttpOnly cookie is preserved. Email delivery remains pending Phase F. Add the JWT plugin only if a future external resource server needs an integration token. |
| Accounts | `GUEST`, `USER`, `ADMIN`, `SUPER_ADMIN` in `src/config/permissions.js` | Configured in Phase B; Phase D adds server enforcement; GUEST is not a stored account role |
| Booking concurrency | Next.js server entry points validate booking, with MongoDB concurrency protection | Requirement fixed; policies and implementation strategy TBD |
| Images | Server-only storage adapter uses ImgBB first, stores media metadata in MongoDB, and serves `i.ibb.co` through Next image optimization | Implemented with WebP resize/EXIF stripping, allow-listed targets/roles, and private delete URLs. ImgBB retention, terms, and provider availability remain external operational risks; never upload sensitive images. |
| Online payments | No online gateway | User-mandated |
| Security headers | Baseline headers in `next.config.mjs`; per-request nonce CSP in `src/proxy.js` | Implemented; production CSP host/proxy allow-list still needs deployment validation. Dynamic rendering replaces static/PPR output because Next.js nonce CSP requires request-time rendering. Production HSTS is preload-ready. |
| Deployment/runtime | TBD | Needs deployment choice, supported Node runtime, app origin and ops plan |
| Auth token lifecycle | Better Auth database-backed sessions with cookie cache disabled and current-user authorization checks | The separate 10–15 minute access JWT plus refresh rotation clause is superseded for this same-origin application. Preserve session-version checks for immediate privilege/security changes. |
| Email provider | Resend SMTP through the shared server-only Nodemailer transport | Contact notification and auto-reply are implemented. A live transport smoke was accepted earlier; inbox/auth-flow delivery remains unverified. If switching to Gmail, use a Google App Password with 2-Step Verification, never a normal account password. |

Before adding a dependency, confirm it serves a current requirement and its peer versions work with the installed stack. Before implementing authentication, booking policies, customer programs, or deployment, resolve the corresponding unknowns in [requirements](REQUIREMENTS.md).
