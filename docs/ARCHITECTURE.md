# Architecture proposal

**Status: the frontend remains a single Next.js App Router app; the planned Express API and data layer are not implemented.**

## Direction

- Keep the existing repository as the Next.js App Router frontend. Do not relocate it into `apps/web` without a concrete monorepo need.
- Add a separate JavaScript Express API (likely `api/` at repository root) as the sole authority for authentication, business rules, MongoDB, SMTP, and ImgBB operations. Document `/api/v1` REST routes.
- Keep API modules small and feature-oriented: configuration, middleware, route/controller, service, repository, validation, and error handling where each is justified. Avoid empty scaffold directories.
- MongoDB Atlas is server-only. Use explicit repository functions and runtime validation; no database calls from browser components.
- Use Better Auth as the single authentication system, with Express as its sole server and Next.js using the supported client. See [AUTHENTICATION.md](AUTHENTICATION.md); verify integration details before the auth phase.
- Start with one deployable API, not microservices, Redis, or Kubernetes. Prefer same-origin reverse proxy where the chosen deployment supports it; otherwise configure a narrow trusted origin and credentials policy.
- Use shadcn/ui as the primary customizable component source if components are needed. Its official JavaScript mode supports `tsx: false`. HeroUI remains optional and should be added only for a specific component that provides clear value without duplicating the shared system.

## Rendering boundary

Use Server Components by default for public content and server-side data composition. Add small Client Component boundaries for booking selection, filters, forms, charts, and interactive navigation. Admin/customer data must be authorized at the API and not publicly/shared cached. Public catalog caching and invalidation are to be selected per route after API behavior and freshness are known.

## Current frontend feature organization

- `src/app/page.js` composes the landing page; `src/app/services/page.js` composes the Services route. Feature sections and data remain separate from route files.
- Repeated service/barber cards and the review carousel live under `src/features/landing/components/`.
- `src/components/layout/` contains shared site chrome and navigation data; `src/components/ui/` contains the brand mark, Button/ButtonLink, card image, section heading, and minimal inline SVG icons.
- `src/components/animations/ScrollReveal.jsx` handles Intersection Observer reveal. Mobile navigation, service filters, carousel, and reveal are small Client Components; page compositions/static sections remain Server Components.
- No Gravity UI package or other UI dependency was added. The official icons package requires the UIKit `Icon` renderer; local inline SVG remains the simpler compatible solution for this small site-specific set.

## Version and compatibility snapshot

Repository `package.json` currently pins Next 16.4.3, React/React DOM 19.3.0, and Tailwind 4. [Next's support policy](https://nextjs.org/support-policy) marks 16.x Active LTS; [shadcn's JavaScript guide](https://ui.shadcn.com/docs/javascript) documents CLI JavaScript components via `tsx: false`, and its [Tailwind v4 guide](https://ui.shadcn.com/docs/tailwind-v4) covers React 19/Tailwind 4. Before dependency changes, check actual installed package versions, official peer requirements and the specific feature guides. Express 5 is the proposed API major; its [migration guide](https://expressjs.com/en/guide/migrating-5/) confirms the major's breaking-change considerations; exact release is to be selected at API foundation time. [HeroUI's current docs](https://www.heroui.com/) should be checked for v3 compatibility if a concrete component need arises. Node runtime version is not declared in the project; the current local runtime reported `v24.21.0`.

## Provisional data domains

Users/roles, services, barbers/schedules, appointments, reviews, gallery assets, business settings, audit events, and (only if confirmed) products, loyalty/offers, email verification/reset tokens, and release status. No payment card data. See [database outline](DATABASE.md) and [decisions](DECISIONS.md).

## Trust boundaries

Browser → Next frontend → Express API → MongoDB/provider services. Browser input and IDs are untrusted. API validates input, derives actor/role from verified server-side authentication, checks ownership and permissions, and revalidates booking availability atomically/concurrently. Secrets exist only in API runtime environment. Image upload acceptance is server-controlled and restricted to intended public media.
