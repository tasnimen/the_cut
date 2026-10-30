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
| `contactDeleteAll` | — | — | ALL | ALL |
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

**Avatar and deletion request (I-10):** the photo route `/api/account/avatar` needs `mediaAvatarOwn` (OWN) and only ever touches the caller's own avatar records; the deletion request actions need `profileOwn`. Admins and super admins can use both for their own account.

**Admin bookings (I-11):** `/admin/bookings` and its Server Action need `bookingsManageAll` (ADMIN and SUPER_ADMIN, scope ALL, TOTP enrolled). Customers and guests get 404 on the page. The action takes only a booking id and a target status; the status rules are re-checked on the server.

**All bookings (I-12):** `/admin/bookings/all` needs `bookingsManageAll` like the day view (same guard, same row actions). It is a read of every customer's bookings, limited to name and phone for contact; customers' user ids are not returned.

**Walk-in (I-13):** `/admin/bookings/walk-in` and its two actions need `bookingsManageAll` (ADMIN and SUPER_ADMIN, TOTP enrolled). Customers and guests get 404.

**Customers list (I-14):** `/admin/customers` needs the `customersRead` permission (ADMIN gets the LIMITED scope, SUPER_ADMIN ALL; both must have TOTP). The page calls `requireDashboardAccess("admin")` and then `requirePrincipal("customersRead")`. It lists only users with role USER. LIMITED means: name, email, join date, suspended flag, booking counts, last completed visit, no-show count, review flag and a pending deletion request. No phone, no role, no password or session data, and no edit actions. Super admins see the same list for now; a fuller view and account management belong to the Super Admin units (I-23 onwards).

**Messages (I-20):** `/admin/messages` and `/admin/messages/[id]` need `contactManageAll` (ADMIN and SUPER_ADMIN, TOTP). Changing status uses the same permission. **Deleting needs `contactDeleteAll`, which the owner decided on 2026-10-30 should be held by Admin as well as Super Admin** (it was Super Admin only before). The Delete button follows the permission and the Server Action checks it on every call.

**Gallery (I-19):** `/admin/gallery`, the upload route `/api/admin/gallery` and the edit, show/hide and delete actions need `mediaGalleryManageAll` (ADMIN and SUPER_ADMIN, TOTP). Customers and guests get 404 on the page and "please sign in" or "not allowed" from the endpoints.

**Image storage (C1):** two new permissions, `mediaBannersManageAll` and `mediaSlotsManageAll` (ADMIN and SUPER_ADMIN, scope ALL), cover uploads to the `banners` and `slots` folders; they have no screens yet (C2 and the image-slot work). `mediaAvatarOwn` stays OWN for every signed-in role. Uploads are capped at 4 MB.

**Reports (I-22):** `/admin/reports` needs `operationalReportsAll` (ADMIN and SUPER_ADMIN, TOTP). It shows counts and rates only. Revenue and any money figure are **not** on this page or in its data: they belong to `financialReportsAll` (Super Admin only, unit I-26), and a test checks that the report data contains no price, revenue, email, phone or customer name.

**Pictures for services, barbers and packages (D1):** a new permission `mediaPackagesManageAll` (ADMIN and SUPER_ADMIN) joins the existing `mediaServicesManageAll` and `mediaBarbersManageAll`. Each upload, replace and remove checks the permission of its kind on its own: in the upload route and again in the save action. A customer or guest cannot upload, replace or remove any of them.

## Super Admin controlled Admin capabilities (P1, 2026-10-30)

On top of the static matrix above, a Super Admin can switch individual Admin capabilities (pages and actions) off. The full list, the routes, how it is enforced and the limits are in [ADMIN_PERMISSIONS.md](ADMIN_PERMISSIONS.md). Rules that matter here: the static matrix is still checked first and can only be narrowed, never widened, by the switches; SUPER_ADMIN is never limited; customers and guests never get a capability; the defaults are everything on, so today's behaviour is unchanged until a Super Admin changes a switch. The question "who may delete contact messages" is answered by the switch `messages.delete` (on by default; the static permission `contactDeleteAll` stays ADMIN and SUPER_ADMIN).

**Permission screen (P2):** `/super-admin/permissions` and `saveAdminPermissionsAction` need `securitySettingsManage` (SUPER_ADMIN only) plus a recent authenticator code. Admins, customers and guests get 404 on the page and "not allowed" from the action.

Admin switches are default deny (2026-10-30): until the Super Admin saves, the Admin has the dashboard overview only. See ADMIN_PERMISSIONS.md.

Archive and restore (services, packages, barbers) are Admin switches `<group>.archive` / `<group>.restore`, default off; permanent delete stays Super Admin only (D2b). See ADMIN_PERMISSIONS.md.
