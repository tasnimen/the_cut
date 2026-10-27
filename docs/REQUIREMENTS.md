# Requirements and status

**Status: initial scope from the user specification and two accessible reference images.** This is a planning artifact, not an implementation claim.

| ID | Requirement | Status / evidence |
|---|---|---|
| R1 | JavaScript and JSX only | Constraint accepted; current starter files are `.js`. |
| R2 | Match supplied dark luxury barbershop visual language | References inspected; tokens and limitations in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). |
| R3 | Public home, about, services, gallery, pricing, booking, shop, contact | Partially implemented: `/`, `/about`, `/services`, `/gallery`, `/pricing`, `/contact` preview, and preview-only `/booking`; `/shop` remains planned. Booking has no API or persistence. Gallery imagery, verified business copy, contact channels, and final menu/prices remain pending. |
| R4 | Customer dashboard for profile, bookings, history, loyalty, offers | Dashboard reference inspected; account and loyalty policy TBD. |
| R5 | Admin dashboard for business operations | Dashboard reference inspected; exact workflows and report definitions TBD. |
| R6 | Super Admin capabilities for system governance | Requested in pasted specification; no visual reference and bootstrap policy TBD. |
| R7 | Better Auth is the only authentication system; Next.js is the selected server boundary | Phase D foundation is in progress: Next.js Route Handler, MongoDB adapter, DB sessions, TOTP, server authz guard, failed-auth audit, and session-bound step-up proof exist. DB sessions are selected for the same-origin app; email delivery, external alerting, production checks, and the remaining security gate stay open. |
| R8 | Next.js Server Actions and Route Handlers are authoritative for business rules | Accepted in Phase B; auth provider handler exists, no business operation is implemented. No separate Express server. |
| R9 | MongoDB Atlas persistence, validation, indexes, backup plan | Phase D Mongo client and auth/audit indexes implemented; the local session endpoint exercised database setup, but no business collections, backup/restore checks, or production verification exist; see [DATABASE.md](DATABASE.md). |
| R10 | Concurrency safe barber/time booking | Required; algorithm and tests belong to booking phase, not designed in detail yet. |
| R11 | Backend email via Nodemailer/SMTP | Requested; provider and email policy TBD. |
| R12 | Server controlled ImgBB upload for suitable public media | Requested; provider limits and URL shapes not validated yet. |
| R13 | Role checks, ownership checks, audit sensitive actions | Required; initial matrix in [ROLE_PERMISSIONS.md](ROLE_PERMISSIONS.md). |
| R14 | Responsive, accessible, image optimized frontend | Required; Booking checked at 1440px, 768px, and 375px in Phase B; other routes and broader accessibility/performance measures remain. |
| R15 | Small verified milestones with honest docs | Accepted; see [progress](PROGRESS.md) and [NEXT_TASK.md](../NEXT_TASK.md). |
| R16 | No online payment gateway | Explicitly stated. In store payment metadata is optional and requires approval. |

## Decisions still needed

- Business address, timezone, hours, contact information, final service/menu/prices, cancellation window, and booking duration/buffer rules.
- Account creation, Better Auth provider/session settings, password reset and verification requirements, and initial Super Admin bootstrap procedure.
- Whether customers may select a barber, write reviews, use loyalty points/offers, and what rules govern each.
- Product catalog and whether the shop page is informational/cartless (no online payment gateway is in scope).
- Deployment host, API origin/reverse proxy, SMTP provider, image retention/deletion policy, and backup capability.
- Image/font asset sources and usage rights.
