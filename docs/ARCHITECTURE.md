# Architecture proposal

**Status: the application is a single Next.js App Router project. Phase D adds a Better Auth Route Handler and server-only MongoDB/auth/security foundation; business APIs and data operations remain unimplemented.**

## Direction

- Keep the existing repository as the Next.js App Router frontend. Do not relocate it into `apps/web` without a concrete monorepo need.
- Keep future business operations inside this Next.js app using Server Actions for mutations and Route Handlers for explicit HTTP endpoints. Do not add a separate Express server unless the user changes this decision.
- Keep server code feature-oriented and isolated from Client Components. Use explicit data-access functions, strict runtime validation, and server-only environment access; do not add empty scaffold directories.
- MongoDB Atlas and provider credentials remain server-only. No database calls from browser components.
- Better Auth remains the only approved authentication system. `src/lib/db/mongo.js` owns the server-only MongoDB client; `src/lib/auth/server.js` configures Better Auth; `/api/auth/[...all]` is its Next.js handler. Use `requirePrincipal()` on future server entry points and follow the role matrix. See [AUTHENTICATION.md](AUTHENTICATION.md).
- Sessions currently use Better Auth's DB-backed cookie session. The separate access/refresh rotation clause is superseded for this same-origin project; see [DECISIONS.md](DECISIONS.md) and [SECURITY.md](SECURITY.md).
- `src/lib/security/audit-log.js` provides a strict append-only event insert helper. No privileged business actions or event sources have been added yet.
- `src/proxy.js` applies a nonce CSP before application requests. Since the installed Next.js guide says nonce CSP cannot use PPR, cache components/partial prerendering are disabled and the root layout waits for a request; pages now server-render per request and lose static/ISR caching. See [security limits](SECURITY.md).
- Keep one deployable app, not microservices, Redis, or Kubernetes. Prefer same-origin routes and avoid cross-origin credentials unless deployment requires them.
- Use shadcn/ui as the primary customizable component source if components are needed. Its official JavaScript mode supports `tsx: false`. HeroUI remains optional and should be added only for a specific component that provides clear value without duplicating the shared system.

## Rendering boundary

Use Server Components by default for public content and server-side data composition. Add small Client Component boundaries for booking selection, filters, forms, charts, and interactive navigation. Admin/customer data must be authorized within every server entry point and must not be publicly/shared cached. Public catalog caching and invalidation are to be selected per route after data behavior and freshness are known.

## Current frontend feature organization

- `src/app/page.js` composes the landing page; `src/app/services/page.js` composes the Services route. Feature sections and data remain separate from route files.
- About, Gallery, Pricing, and Contact preview pages live under `src/app/`; shared presentation components and sample gallery data live under `src/features/marketing/`.
- Repeated service/barber cards and the review carousel live under `src/features/landing/components/`.
- `src/components/layout/` contains shared site chrome and navigation data; `src/components/ui/` contains the brand mark, Button/ButtonLink, card image, section heading, and minimal inline SVG icons.
- `src/components/animations/ScrollReveal.jsx` handles Intersection Observer reveal. Mobile navigation, service filters, carousel, and reveal are small Client Components; page compositions/static sections remain Server Components.
- No Gravity UI package or other UI dependency was added. The official icons package requires the UIKit `Icon` renderer; local inline SVG remains the simpler compatible solution for this small site-specific set.

Phase C adds a shared `SiteFrame` shell, semantic container/section primitives, `cva` variants with `cn()`, and glass/depth/tilt recipes. Motion code lives under `src/components/motion/` and configuration under `src/lib/motion/`. Lenis and GSAP/ScrollTrigger load dynamically after idle; the R3F gold dust canvas loads only for the home hero, after idle/in-view and outside reduced-motion/low-power conditions. `/design-system` is gated with `notFound()` outside development and is not in public navigation.

## Version and compatibility snapshot

Repository `package.json` pins Next 16.4.3, React/React DOM 19.3.0, and Tailwind 4. Before dependency changes, check installed versions and official peer requirements. Node runtime version is not declared in the project; the local runtime reported `v24.21.0`.

## Provisional data domains

Users/roles, services, barbers/schedules, appointments, reviews, gallery assets, business settings, audit events, and (only if confirmed) products, loyalty/offers, email verification/reset tokens, and release status. No payment card data. See [database outline](DATABASE.md) and [decisions](DECISIONS.md).

## Trust boundaries

Browser -> Next.js server entry points -> MongoDB/provider services. Treat browser input and IDs as untrusted. Each server entry point validates data, derives the actor from verified authentication, checks ownership and permissions, and revalidates availability with concurrency protection. Secrets stay in the server environment; uploads remain server-controlled.
