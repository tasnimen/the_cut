# The Cut — Luxury Barbershop

**Status: early implementation.** Home (`/`) and Services (`/services`) follow the supplied design direction and use local salon photos. Verified business content, other destination routes, backend, and authentication remain incomplete. Check [progress](docs/PROGRESS.md) and [the handoff](docs/AI_HANDOFF.md) for verification status.

## Product

A single barbershop website with public pages, customer booking and account views, and staff administration. The design direction is a dark, image led barbershop experience with fine blue green borders, warm gold actions, and serif editorial headings. See [the design system](docs/DESIGN_SYSTEM.md) and [requirements](docs/REQUIREMENTS.md).

## Current repository

- Next.js App Router, JavaScript, React, and Tailwind CSS are present.
- Home composition: `src/app/page.js`; Services route: `src/app/services/page.js`; feature sections/data: `src/features/`; shared header/footer: `src/components/layout/`.
- No Express API, database connection, authentication, or business operations are implemented. Homepage placeholders and unimplemented destinations are tracked in [the handoff](docs/AI_HANDOFF.md).
- See [progress](docs/PROGRESS.md) and [the next task](NEXT_TASK.md).

## Development

Install dependencies with `npm ci`, then run `npm run dev`. Available scripts are `dev`, `build`, `start`, and `lint`. This documents the existing scripts; it does not report them as run or passing.

## Documentation

- [Architecture and open decisions](docs/ARCHITECTURE.md)
- [Implementation roadmap](docs/IMPLEMENTATION_PLAN.md)
- [Roles and permissions](docs/ROLE_PERMISSIONS.md)
- [Authentication plan](docs/AUTHENTICATION.md)
- [Database outline](docs/DATABASE.md)
- [Security plan](docs/SECURITY.md)
- [Next.js optimization plan](docs/NEXTJS_OPTIMIZATION.md)
- [Landing page audit](docs/LANDING_PAGE_AUDIT.md)
- [Asset inventory](docs/ASSET_INVENTORY.md)
- [Canonical design system](docs/DESIGN_SYSTEM.md)
- [Component guide](docs/COMPONENT_GUIDE.md)

No credentials belong in source control. Deployment, backups, delivery integrations, and production readiness remain future work.
