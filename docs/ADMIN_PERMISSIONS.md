# Admin permissions controlled by the Super Admin

Status (2026-10-30): **engine (P1) and the Super Admin screen (P2) are built, tested and live-verified as the real Admin on 2026-10-30 (see TESTING.md).** The switches are changed at `/super-admin/permissions`. **Default deny (since 2026-10-30):** with no saved document, a missing key or a non-boolean value, every switch is OFF and the Admin can open only the dashboard overview (`/admin`, always open, no switch). The owner's current set (all 26 on) was saved explicitly before this was switched on. There is one Admin account and one shared set of switches (no per-Admin grants, by the owner's decision).

## How it works

- A **capability** is `<group>.<action>` (for example `messages.delete`). The list lives in `src/config/admin-capabilities.js`; it is the only place that defines what can be switched.
- The switches are stored in one document: collection `adminPermission`, `_id: "admin-grants"`, field `grants` (`{ capability: true | false }`), plus `version`, `updatedAt`, `updatedBy`. A missing document, a missing key or a non-boolean value means the default, which is **off** (default deny). `allGrants()` (every switch on) is only used by the screen's "Switch everything on" button; `denyAllGrants()` is the default.
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

## Capabilities (32 switches; default deny, nothing is on until the Super Admin saves it)

| Group | Capability | Controls | Enforced in |
|---|---|---|---|
| Bookings | `bookings.view` | Today's bookings, all bookings with search and filters (pages `/admin/bookings`, `/admin/bookings/all`) | page guard |
| | `bookings.walkIn` | Walk-in page and creating walk-in bookings | page guard, walk-in actions |
| | `bookings.changeStatus` | Confirm, complete, mark no-show | status action, `POST /api/bookings/[id]/no-show` |
| | `bookings.cancel` | Cancel a booking (the customer is emailed) | status action |
| Customers | `customers.view` | Read-only customers list and search | page guard |
| Services | `services.view` / `.create` / `.edit` / `.archive` / `.restore` | List (Active and Archived tabs); create (with picture); edit, picture, show or hide; archive; restore | page guards, service actions, `/api/admin/catalog-image`, `/api/media` |
| Packages | `packages.view` / `.create` / `.edit` / `.archive` / `.restore` | Same for pricing packages | same |
| Barbers | `barbers.view` / `.create` / `.edit` / `.archive` / `.restore` | Same for barbers (archive is refused while the barber has upcoming bookings) | same |
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

## The Super Admin screen (P2)

`/super-admin/permissions` (Super Admin area, `requirePrincipal("securitySettingsManage")`, never reachable by an Admin; a test checks it is not an Admin route). It lists every group with its pages and a checkbox per capability, with the description. Turning a page's "view" off greys out and turns off its actions. A review box shows, per area, what an Admin can do with the current (unsaved) choices. Buttons: Save changes, Discard changes, Switch everything on (then Save). It shows when and how many times it was last saved. One set of switches applies to every Admin (there are no per-person permissions).

Saving (`saveAdminPermissionsAction`): Super Admin only, rate limited (20 per minute), then a **recent authenticator code** is required (the existing step-up, valid 10 minutes); if it is missing the screen asks for the 6-digit code inline, verifies it with Better Auth and retries. Only known capability ids with true or false are accepted; the save is audited with counts only.

**What the switches hide:** the Admin sidebar leaves out pages that are off (computed in the Admin layout; it updates on the next full page load, the server refuses the page at once); list pages hide New, Edit, Hide or Show buttons (services, packages, barbers, gallery), the walk-in button, booking status buttons (Cancel versus the other changes), message status and Delete buttons, the gallery upload panel and the package import button. Business settings open read-only (inputs and Save disabled) when `settings.edit` is off. These are conveniences; every action and page is still refused on the server.

## Known limitations

- The sidebar menu is built in the layout, which does not re-render when moving between Admin pages; a revoked page can stay in the menu until the next full page load (the page itself is refused at once). Buttons hide on the next page render.
- No per-person permissions: one set for all Admins. Per-Admin overrides were not built.
- Page-level checks in a few pages (customers, gallery, messages, reports) still also call the static `requirePrincipal(permission)`; the switch is applied by the page guard.
- The grants are read from the database on every guarded call (one small document by id). If the database is slow, so is every admin action; a cache with a short life can be added later at the cost of a delay in applying changes.
- Not live-verified. Automated tests cover the catalog, the resolution rules, the server checks (revoke applies on the next call, Super Admin never limited, fail closed, TOTP and status rules unchanged) and the coverage guard.

## Fixes after the live test (2026-10-30, both verified live as the Admin)
- **Site images switch:** `capabilityAllowed` required the group's `.view` switch for every action. The `siteImages` group has no page and no view switch, so `siteImages.manage` could never be effective. Rule now: an action needs its group's view switch **only when the group has one**. No new capability was added (the 26 saved switches stay as they are). The upload path is `POST /api/media` with target `banners`, `slots` or `products` (`capabilityForMediaTarget`); off or unsaved gives 403, on passes the switch, Super Admin is never limited.
- **Real HTTP 404 for a revoked page:** the admin loading shell streamed with status 200 before a page's own check ran. `src/proxy.js` now sets an `x-pathname` request header on every request (overwriting any client value), `capabilityForAdminPath(pathname)` in `config/admin-capabilities.js` maps a path to its switch (exact route first, then `[slug]`/`[id]` routes; the overview and unknown paths need none), and `src/app/admin/layout.jsx` passes that switch to `requireDashboardAccess("admin", { capability })`, so `notFound()` fires before anything streams. Every page still checks its own switch (defence in depth), APIs and Server Actions are unchanged. Limit: after a soft navigation inside the app the layout is not re-run, so there the page check applies (the user still sees the 404 view; the status code only matters for full page loads and direct URLs). The denied page's tab title is now the generic "Admin | The Cut Barbershop".

## Archive and restore (D2a, built 2026-10-31 and live-verified with the real Super Admin and Admin, see TESTING.md)
- **What:** services, pricing packages and barbers can be archived and restored (`src/lib/catalog/archive.js`, one shared implementation). Archiving sets `archivedAt` and `archivedBy` and `active: false`; restoring clears both fields and leaves the record **hidden**. Gallery photos and messages are D2b. Nothing is deleted: slug reserved (unique index), pictures stay attached and stored, old bookings keep their own snapshots, audit history stays.
- **Switches:** `<group>.archive` and `<group>.restore` for services, packages and barbers (6 new, default off, so the catalog is now 32 switches; a saved record without them keeps them off). They need the group's View switch like the other actions. They are independent of Edit. The Super Admin is never limited.
- **Permanent delete:** not built. It stays Super Admin only and comes with D2b (a Super Admin permission, no Admin switch). No Admin hard delete exists for these three kinds.
- **Barber rule:** archive is refused while the barber has an upcoming booking with status pending or confirmed (`startsAt` in the future); the message says how many. A small race (a booking created between the check and the write) is possible but the booking engine reads `active: true` at booking time, so the barber stops taking bookings the moment the archive lands.
- **Server:** `archive<Kind>Action(slug)` and `restore<Kind>Action(slug)` in each `actions.js`: `requirePrincipal("<kind>ManageAll", { capability: "<kind>.archive|restore" })`, rate limit (existing bucket), slug check, repository, audit (`catalog.<kind>.archived` / `.restored`), cache refresh. An archived record is read-only: `update…` and `set…Active` refuse it (`archived`), and its edit page shows a notice instead of the form.
- **Screens:** each list has an Active / Archived tab (`?view=archived`, needs only the View switch). Archive and Restore buttons follow the switches. Hide/Show stays for non-archived records.
- **Public data:** the public readers treat an archived record as inactive (`hideArchived`), the booking engine already filters `active: true`, and the seed script skips archived records (a test proves it cannot bring one back).
- **Package badge:** archiving a package clears its Popular badge and restoring does not bring it back (tick it again in the edit form if wanted).
- **Limits:** no auto-purge; restore returns hidden by design; a package list with only archived packages shows an empty list, not the built-in packages notice.

## Email log switches (Stage C, 2026-10-31)
`emailLog.view` (the page `/admin/email-log`) and `emailLog.resend` (the Resend button), both default off like every new switch; the catalog now has 34 switches. Permission `mailLogManageAll` (ADMIN and SUPER_ADMIN, still gated by the switches). See EMAIL.md.
