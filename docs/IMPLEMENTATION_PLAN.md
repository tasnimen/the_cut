# Implementation roadmap

**Status: phase 4, shared UI/public site, is in progress.** This roadmap separates verified implementation from planned work.

| Phase | Scope | Current evidence/status |
|---|---|---|
| 0 — Inspect | Repository, references, installed framework guides and dependencies | Completed and recorded in project docs. |
| 1 — Requirements/design | Requirements, design/component matrices, roles, architecture, data/security/optimization | Planning docs exist; product and business unknowns remain. |
| 2 — Foundation | Supported JS setup, API package, environment validation, logging, DB connection, baseline | Frontend baseline is Next.js App Router, JavaScript, React 19 and Tailwind 4. No Express/API/DB foundation yet. |
| 3 — Authentication | Better Auth, three roles, ownership, bootstrap, permission coverage | Not implemented. Better Auth remains mandatory; inspect current setup/integration docs before work. |
| 4 — Shared UI/public site | Shared components and public routes | Home `/`, Services `/services`, and preview-only Booking `/booking` implemented. About, Barbers, Gallery, Pricing, Shop, Contact remain planned. Booking backend and browser visual review remain outstanding. |
| 5 — Providers | SMTP email and controlled ImgBB media workflow | Not implemented; providers and credentials are not configured. |
| 6 — Customer/booking | Customer accounts and concurrency-safe booking | Not implemented; business rules and API are unresolved. |
| 7 — Admin | Business management, settings, reports | Not implemented. |
| 8 — Super Admin | Admin lifecycle, system settings, audit/release/health views | Not implemented. |
| 9 — Quality/optimization | Accessibility, security, image/font/bundle/performance | Lint/build work occurs per frontend milestone; broader measurements and browser verification remain. |
| 10 — Operations/handover | Deploy, monitor, backup/restore, rollback, release | Not implemented; deployment choices unresolved. |

Current next step: implement the About page; see [`NEXT_TASK.md`](../NEXT_TASK.md). Keep each step narrow and revisit open choices in [`DECISIONS.md`](DECISIONS.md) when evidence or business answers become available.
