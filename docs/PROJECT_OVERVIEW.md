# Project overview

**Status: Phases A-C complete; Phase D security hardening active and partial; Phase E public routes implemented with illustrative content.** Home, About, Services, Gallery, Pricing, Contact preview, and a preview-only Booking interface are implemented. Shop, contact delivery, booking backend, dashboards, and remaining Phase D security work are not complete.

The Cut is one barbershop's public website and management application. Its intended surfaces are public marketing and service discovery, customer booking/account views, and staff tools. It is not multi tenant. The design references depict an eight-page public site, an admin dashboard, and a customer dashboard; they do not show a Super Admin interface.

The repository contains a Next.js App Router application in JavaScript with Next 16.4.3, React 19.3.0, and Tailwind CSS 4. Home (`/`), About (`/about`), Services (`/services`), Gallery (`/gallery`), Pricing (`/pricing`), Contact (`/contact` preview), and a preference-only Booking interface (`/booking`) are implemented. Phases B/C add shared configuration and tokens, self-hosted fonts, baseline headers, UI/layout primitives, glass/depth/motion recipes, and a development-only design-system preview. Phase D adds Better Auth and MongoDB foundations but remains partial. Contact delivery, booking persistence, shop operations, dashboards, and verified business information remain outstanding. Future backend operations are planned inside Next.js Server Actions and Route Handlers; a separate Express app is out of scope under the current decision.

Page titles, descriptions, canonical paths, robots rules, and a route-registry-driven sitemap are set up. Sitemap generation requires a non-local `SITE_URL`; JSON-LD and production-domain validation wait for confirmed business facts and deployment configuration.

Product scope and unresolved choices: [requirements](REQUIREMENTS.md), [architecture](ARCHITECTURE.md), [roles](ROLE_PERMISSIONS.md), [progress](PROGRESS.md).
