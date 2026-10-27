# Implementation roadmap

**Status: Phase D security/data foundation is partial; high-priority security work remains.** This roadmap separates verified implementation from planned work.

| Phase | Scope | Current evidence/status |
|---|---|---|
| 0 â€” Inspect | Repository, references, installed framework guides and dependencies | Completed and recorded in project docs. |
| 1 â€” Requirements/design | Requirements, design/component matrices, roles, architecture, data/security/optimization | Planning docs exist; product and business unknowns remain. |
| 2 — Foundation | Supported JS setup, design tokens, fonts, config, environment validation, baseline headers | Phase B complete: Next.js App Router, JavaScript, React 19, Tailwind theme, Zod env validation, and baseline response headers. No auth/DB/business API. |
| 3 — Authentication | Better Auth, roles, ownership, bootstrap, permission coverage | Partial: Better Auth Route Handler, Mongo adapter/TOTP, permission guard, DB session lifecycle, shared auth rate limits, selected audit events, and user-update version bumps for role/status/2FA changes exist. Email delivery, failed-auth audit, tested session invalidation, step-up, and live service checks remain. |
| 4 — Shared UI/public site | Shared components and public routes | Phase C foundations are implemented. Home, About, Services, Gallery, Pricing, Contact preview, and preview-only Booking are composed through the shared shell. The Shop, verified business copy/assets, live contact messaging, and SEO validation on a production domain remain. |
| 5 â€” Providers | SMTP email and controlled ImgBB media workflow | Not implemented; providers and credentials are not configured. |
| 6 â€” Customer/booking | Customer accounts and concurrency-safe booking | Not implemented; business rules and API are unresolved. |
| 7 â€” Admin | Business management, settings, reports | Not implemented. |
| 8 â€” Super Admin | Admin lifecycle, system settings, audit/release/health views | Not implemented. |
| 9 â€” Quality/optimization | Accessibility, security, image/font/bundle/performance | Lint/build work occurs per frontend milestone; broader measurements and browser verification remain. |
| 10 â€” Operations/handover | Deploy, monitor, backup/restore, rollback, release | Not implemented; deployment choices unresolved. |

Current next step: proceed to Phase F provider and contact-mail work after Phase E public routes; the user directed that remaining Phase D security blockers be deferred until after the project build. Phase D remains partial and is not security-approved. See [`NEXT_TASK.md`](../NEXT_TASK.md).
