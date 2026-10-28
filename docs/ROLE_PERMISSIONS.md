# Roles and permissions

**Source of truth:** [`src/config/permissions.js`](../src/config/permissions.js). [`src/lib/auth/policy.js`](../src/lib/auth/policy.js) evaluates it with deny-by-default semantics; [`src/lib/auth/authorization.js`](../src/lib/auth/authorization.js) applies the current Better Auth session and active/verified-account checks. No privileged business route or role mutation exists yet.

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
