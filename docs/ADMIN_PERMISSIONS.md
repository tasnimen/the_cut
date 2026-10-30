# Admin permissions controlled by the Super Admin

Status (2026-10-30): **engine built (unit P1), tested, not live-verified. The Super Admin screen to change the switches is unit P2 and does not exist yet.** Until P2, every switch is on (the default), so Admins can do exactly what they could before. Changes can only be made directly in the database or through `saveAdminGrants` (no UI).

## How it works

- A **capability** is `<group>.<action>` (for example `messages.delete`). The list lives in `src/config/admin-capabilities.js`; it is the only place that defines what can be switched.
- The switches are stored in one document: collection `adminPermission`, `_id: "admin-grants"`, field `grants` (`{ capability: true | false }`), plus `version`, `updatedAt`, `updatedBy`. A missing document, a missing key or a non-boolean value means the default, which is **on** (what an Admin could do before this system).
- **Server enforcement, on every call, no cache:**
  - Actions and API routes: `requirePrincipal(permission, { capability })` (`src/lib/auth/authorization.js`). Runs after the existing session, status, role, TOTP and permission checks. Only for ADMIN; a denial throws `AuthorizationError(403)` and is written to the audit log (`authorization.denied`).
  - Pages: `requireDashboardAccess("admin", { capability })` (`src/lib/auth/dashboard-guard.js`). A revoked page is a 404, like a page that does not exist.
  - Because grants are read at each call, a change applies on the Admin's **next click**, with no sign-out.
- **SUPER_ADMIN is never limited** by capabilities. Customers and guests never get any capability.
- **Fail closed:** if the grants cannot be read (database error), an Admin is refused. A Super Admin is not affected.
- A non-view capability only works while its group's `view` is on (turning a page off turns its buttons off too).
- Areas that are not capabilities at all stay Super Admin only and can never be given to an Admin: `/super-admin/*`, this permission screen, audit log, admin accounts, security settings, revenue.
- The dashboard overview `/admin` is always open to every Admin (it is the landing page; it shows no data from a switchable area).
- A test (`capability-coverage.test.js`) fails if a new admin action, API route or page forgets its capability, or uses an unknown one.

## Capabilities (all on by default)

| Group | Capability | Controls | Enforced in |
|---|---|---|---|
| Bookings | `bookings.view` | Today's bookings, all bookings with search and filters (pages `/admin/bookings`, `/admin/bookings/all`) | page guard |
| | `bookings.walkIn` | Walk-in page and creating walk-in bookings | page guard, walk-in actions |
| | `bookings.changeStatus` | Confirm, complete, mark no-show | status action, `POST /api/bookings/[id]/no-show` |
| | `bookings.cancel` | Cancel a booking (the customer is emailed) | status action |
| Customers | `customers.view` | Read-only customers list and search | page guard |
| Services | `services.view` / `.create` / `.edit` | List; create (with picture); edit, picture, show or hide | page guards, service actions, `/api/admin/catalog-image`, `/api/media` |
| Packages | `packages.view` / `.create` / `.edit` | Same for pricing packages | same |
| Barbers | `barbers.view` / `.create` / `.edit` | Same for barbers | same |
| Gallery | `gallery.view` | The gallery manager page | page guard |
| | `gallery.upload` | Adding photos | `POST /api/admin/gallery`, `/api/media` |
| | `gallery.edit` | Title, category and description | gallery action |
| | `gallery.hide` | Hide and show | gallery action |
| | `gallery.delete` | Delete a photo and its stored file | gallery action |
| Messages | `messages.view` | Read messages, reply-by-email link | page guards |
| | `messages.markStatus` | Mark as read or replied | message action |
| | `messages.delete` | Delete a message | message action |
| Reports | `reports.view` | Operational reports | page guard |
| Settings | `settings.view` / `.edit` | See and save hours, closed dates, contact and social links | page guard, settings actions |
| Site images | `siteImages.manage` | Banner, slot and product image uploads (API only, no screen) | `/api/media` |

Not offered as capabilities because the feature does not exist or is forbidden by design: delete or edit bookings (bookings only change status), edit or delete customers (Super Admin only), archive and restore (unit D2 will add them).

## Admin routes and their switch

`/admin/bookings`, `/admin/bookings/all` (`bookings.view`); `/admin/bookings/walk-in` (`bookings.walkIn`); `/admin/customers` (`customers.view`); `/admin/services` (`services.view`), `/new` (`services.create`), `/[slug]` (`services.edit`); the same three for `packages` and `barbers`; `/admin/gallery` (`gallery.view`); `/admin/messages` and `/[id]` (`messages.view`); `/admin/reports` (`reports.view`); `/admin/settings` (`settings.view`). Source of truth: `ADMIN_ROUTE_CAPABILITIES`.

## Saving changes (used by P2)

`saveAdminGrants(db, input, actorId)` accepts only known capability ids with boolean values (anything else is refused without writing), stores the complete map, bumps `version`, and writes an audit entry `permissions.admin_grants_updated` with counts only (changed, granted, revoked), never names or values. The Super Admin screen (P2) must call it behind `requirePrincipal("securitySettingsManage")` (Super Admin only) and `requireRecentStepUp`.

## Known limitations

- No screen yet (P2). The sidebar and buttons are not yet hidden from the switches: a revoked page is a 404 and a revoked action is refused with "You are not allowed to do that", but a link or button may still be visible. P2 hides them.
- Page-level checks in a few pages (customers, gallery, messages, reports) still also call the static `requirePrincipal(permission)`; the switch is applied by the page guard.
- The grants are read from the database on every guarded call (one small document by id). If the database is slow, so is every admin action; a cache with a short life can be added later at the cost of a delay in applying changes.
- Not live-verified. Automated tests cover the catalog, the resolution rules, the server checks (revoke applies on the next call, Super Admin never limited, fail closed, TOTP and status rules unchanged) and the coverage guard.
