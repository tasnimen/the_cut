# Roles and permissions

**Source of truth:** [`src/config/permissions.js`](../src/config/permissions.js). [`src/lib/auth/policy.js`](../src/lib/auth/policy.js) evaluates it with deny-by-default semantics; [`src/lib/auth/authorization.js`](../src/lib/auth/authorization.js) applies the current Better Auth session and active/verified-account checks. Booking admin operations are listed below; unrelated role mutation/bootstrap remains unimplemented.

## Phase G booking routes

- `GET /api/bookings/availability`: public, rate-limited read; only active service/barber/slot DTOs are returned.
- `GET /api/bookings` and `POST /api/bookings`: `bookingOwn`; ACTIVE Better Auth session required (verified email only when `AUTH_REQUIRE_EMAIL_VERIFICATION=true`), records are scoped to the current user.
- `POST /api/bookings/[id]/cancel` and `/reschedule`: `bookingOwn`; booking lookup includes current user ownership.
- `POST /api/bookings/[id]/no-show`: `bookingsManageAll` (ADMIN/SUPER_ADMIN with the existing admin TOTP requirement).
- Mutations additionally apply per-IP rate limits, strict schemas, audit logging, and transaction-protected data operations. There is no guest booking path.

Roles are `GUEST` (unauthenticated; not stored), `USER`, `ADMIN`, and `SUPER_ADMIN`. `OWN` means records scoped to the authenticated actor; `LIMITED` means restricted fields through role-specific DTOs; `ALL` means the whole authorized resource set. A missing role entry is denied.

| Capability (`PERMISSIONS` key) | GUEST | USER | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `publicRead` | Yes | Yes | Yes | Yes |
| `contactCreate` | Yes | Yes | Yes | Yes |
| `bookingStart` | Yes | Yes | Yes | Yes |
| `profileOwn` | — | OWN | OWN | OWN |
| `sessionsOwn` | — | OWN | OWN | OWN |
| `avatarOwn` | — | OWN | OWN | OWN |
| `mediaAvatarOwn` | — | OWN | OWN | OWN |
| `bookingOwn` | — | OWN | OWN | OWN |
| `ordersOwn` | — | OWN | OWN | OWN |
| `loyaltyOwn` | — | OWN | OWN | OWN |
| `offersRedeemOwn` | — | OWN | OWN | OWN |
| `reviewCreateOwn` | — | OWN | — | — |
| `bookingsManageAll` | — | — | ALL | ALL |
| `customersRead` | — | — | LIMITED | ALL |
| `barbersManageAll` | — | — | ALL | ALL |
| `servicesManageAll` | — | — | ALL | ALL |
| `packagesManageAll` | — | — | ALL | ALL |
| `productsManageAll` | — | — | ALL | ALL |
| `galleryManageAll` | — | — | ALL | ALL |
| `mediaGalleryManageAll` | — | — | ALL | ALL |
| `mediaProductsManageAll` | — | — | ALL | ALL |
| `mediaBarbersManageAll` | — | — | ALL | ALL |
| `mediaServicesManageAll` | — | — | ALL | ALL |
| `pricingManageAll` | — | — | ALL | ALL |
| `offersManageAll` | — | — | ALL | ALL |
| `loyaltyRulesManageAll` | — | — | ALL | ALL |
| `reviewsModerateAll` | — | — | ALL | ALL |
| `ordersManageAll` | — | — | ALL | ALL |
| `ordersRefundAll` | — | — | — | ALL (step-up) |
| `bookingsDeleteAll` | — | — | — | ALL (step-up) |
| `contactManageAll` | — | — | ALL | ALL |
| `contactDeleteAll` | — | — | — | ALL |
| `operationalReportsAll` | — | — | ALL | ALL |
| `financialReportsAll` | — | — | — | ALL |
| `financialExportAll` | — | — | — | ALL (step-up) |
| `userAccountsManage` | — | — | LIMITED | ALL |
| `adminAccountsManage` | — | — | — | ALL (step-up) |
| `rolesManage` | — | — | — | ALL (step-up, audit-logged) |
| `auditRead` | — | — | — | ALL |
| `businessSettingsManage` | — | — | ALL | ALL |
| `securitySettingsManage` | — | — | — | ALL (step-up) |
| `otherUsersSessionsManage` | — | — | — | ALL |

Authorization must be enforced server-side in every Server Action, Route Handler, and data access function. UI visibility is not an authorization boundary. User-owned records must be scoped to the session actor. Do not implement role changes, admin management, or Super Admin bootstrap in this phase.

Developer tooling: `/design-system` is a development-only route in `src/config/routes.js`, gated by the server page with `notFound()` outside development. It is not a role grant and does not appear in public navigation.

Admin and Super Admin authorization also requires TOTP enrollment. A role change/bootstrap flow is intentionally absent. Session/version invalidation after such a change remains future work because there is no privileged role-management operation yet.

## Dashboard areas (unit I-1, 2026-10-29)

Rules live in `src/config/dashboard-access.js` (pure, tested) and are applied by `requireDashboardAccess(area)` in `src/lib/auth/dashboard-guard.js`.

| Area | Path | Roles | TOTP required | Visitor without access |
|---|---|---|---|---|
| User | `/user` | USER, ADMIN, SUPER_ADMIN (own data) | no | Guests are redirected to `/sign-in?callbackUrl=%2Fuser`; other roles/suspended accounts get **404** |
| Admin | `/admin` | ADMIN, SUPER_ADMIN | yes (redirect to `/two-factor` until enrolled; page arrives in I-3) | **404** (guests too) |
| Super admin | `/super-admin` | SUPER_ADMIN | yes | **404** (guests too) |

Responses for these paths carry `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow` (`next.config.mjs`); `robots.txt` disallows them. Stale sessions (`sessionVersion` mismatch) count as signed out. **Pattern for every unit:** each dashboard page calls `requireDashboardAccess(area)` (a layout alone is not enough because layouts are not re-rendered between sibling pages), and each server action or route handler calls `requirePrincipal(permission)` (`lib/auth/authorization.js`), which re-checks the session, status, permission, session version and TOTP on every call. After sign-in, admins land on their dashboard (`landingPathFor`); customers stay on the public site until the user dashboard is built (`USER_DASHBOARD_ENABLED`).

**Two-factor enrolment (I-3):** `/two-factor` is for ADMIN and SUPER_ADMIN only; customers receive 404.

**Customer dashboard (I-8):** `/user` and `/user/appointments` show only the signed-in user's own bookings (`repository.listMine` filters by the session's user id; no id is accepted from the client). Cancel and reschedule are Server Actions (`app/user/actions.js`) that re-check `bookingOwn`, rate limit per user (20 per minute), validate the booking id (24 hex characters) and the new time/barber, and then call the repository, which re-checks ownership, status and the 24-hour cutoff. After sign-in, customers now land on `/user` (`USER_DASHBOARD_ENABLED`).

**Profile page (I-9):** `/user/profile` (customers, admins and super admins can all use it for their own account) uses the `profileOwn` and `sessionsOwn` permissions, both OWN scope. The Server Actions in `app/user/profile/actions.js` act only on the signed-in user; no user or session owner id is accepted from the client. Seeing or ending other people's sessions stays a Super Admin permission (`otherUsersSessionsManage`) for a later unit.
