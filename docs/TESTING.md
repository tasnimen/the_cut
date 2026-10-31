# Testing

## Local verification

The project uses Vitest (`npm test`), ESLint (`npm run lint`), and Next.js production compilation (`npm run build`). On Windows, `npm.cmd` may be used from PowerShell. Current Phase G verification results are maintained in `docs/PROGRESS.md` and `docs/AI_HANDOFF.md`.

Booking unit tests use mocked Mongo collections and mock mail transports. They cover trusted server prices, invalid/unset prices, rejected client price/duration fields, historical price snapshots, overlap races, owner scoping, active-booking caps, schedule conflicts, DST transitions, state transitions, seed target/opt-in guards, seed idempotency, and preservation of existing barber schedules. No real SMTP or database service is contacted by those tests.

## Phase G results (2026-10-29)

- `npm.cmd test`: 225 passed across 15 files.
- `npm.cmd run lint`: exit 0, no errors, one existing `HeroSection.jsx` aria-hidden warning.
- `npm.cmd run build`: passed; all booking API routes and the app compiled.
- `node --check scripts/seed-booking.js` and `node --check src/lib/booking/seed-core.js`: passed.
- No seed, live database write, SMTP send, upload, sign-up, or browser booking test ran.

## Seed preflight and opt-in

`npm run seed:booking:dev` defaults to a read-only database preflight. It requires `NODE_ENV=development`, resolves the effective database with the app's `MONGODB_DB_NAME` override / URI database behavior, and refuses unless the result is exactly `the_cut`. The opt-in name/value and exact PowerShell commands are documented in [BOOKING_RULES.md](BOOKING_RULES.md). Actual writes additionally require `--apply` and the explicit opt-in environment value. Do not run `--apply` until the preflight actions and warning are reviewed.

The seed has not been run by this task. No live database write, email, upload, sign-up, or browser booking test was performed.

## Manual verification after user-authorized seed

1. Review the dry-run output and verify its target says `the_cut`; do not reveal the connection URI.
2. Before and after the authorized seed, verify representative user, session, verification, and email-related records remain present. Do not export or display credentials/tokens.
3. Confirm six service records and the approved USD prices/durations in the service collection and `/booking` UI.
4. Confirm booking attempts are rejected if a service record has an unset/invalid price; restore the approved value afterward.
5. With a verified active Better Auth customer session, make a booking and confirm the persisted snapshot uses the database price and duration. Confirm a client-supplied price is rejected.
6. Attempt the same barber/time concurrently and verify exactly one booking succeeds. Verify another customer cannot list/cancel/reschedule that booking.
7. Check cancellation/reschedule cutoff and admin no-show grace behavior using authorized test sessions.
8. Test confirmation/reminder email only in a configured test environment with mock transport or an explicitly authorized test recipient.

Live Atlas transaction/session behavior, real barber schedule accuracy, provider delivery, and visual browser behavior remain unverified.

## Admin seed

Dry run (read-only): `$env:NODE_ENV='development'; npm run seed:admins:dev`. Apply: also set `$env:ALLOW_ADMIN_SEED='YES_I_REVIEWED_THE_DEV_DATABASE'` and add `-- --apply`. Unit tests: `src/lib/auth/admin-seed-core.test.js` (credential rules, guards, plan, no password in messages). The live write has not been run by the assistant (the owner has not set the `SEED_*` values yet).

## Admin TOTP (I-3)

Manual live check once an Admin exists (after `npm run seed:admins:dev`): sign in as the Admin, open `/admin` (redirects to `/two-factor`), enter the password, add the setup key to an authenticator app, save the backup codes, enter the 6-digit code, then sign in again: the sign-in page asks for the code, a wrong code is refused, a backup code works once, and `/admin` opens. Automated coverage is in `src/lib/auth/two-factor-flow.test.js`.

## Services editor (I-15)

Manual check as an enrolled Admin (dev database): open `/admin/services` (six services, order, prices); open one, change the price (for example 25 to 26), save: a toast appears, then `/services` and `/pricing`-linked booking lists show the new price within seconds (restore it afterwards); hide a service and confirm it disappears from `/services`, the home page and `/booking`, then show it again; create `test-service` and confirm a duplicate identifier is refused; sign out and confirm `/admin/services` is a 404; as a customer account confirm `/admin/services` is a 404. Check `auditLog` for `catalog.service.*` events. Automated coverage: `src/lib/catalog/*.test.js`, `src/app/admin/services/actions.test.js`.

## Packages editor (I-16)

Manual check as an enrolled Admin (dev database): open `/admin/packages` (empty: shows the import prompt), click "Import the current packages" (three packages appear; `/pricing` unchanged); edit Standard's price (for example 40 to 42) and save: toast, then `/pricing` shows $42.00 within seconds (restore it afterwards); mark Premium as Popular and confirm Standard loses the badge; hide Basic and confirm it disappears from `/pricing`, then show it; create `test-package` with a linked service and check that `/booking?package=test-package` preselects it; try an unknown service value by editing the form (refused). Sign out or use a customer account: `/admin/packages` is a 404. Check `auditLog` for `catalog.package.*` events. Automated coverage: `src/lib/catalog/*.test.js`, `src/app/admin/packages/actions.test.js`.

## Barbers editor (I-17)

Manual check as an enrolled Admin (dev database): open `/admin/barbers` (four barbers, "Active without working hours: 4"); edit Daniel Carter: tick Monday to Friday 09:00 to 19:00 with a 12:00 to 13:00 break, tick every service, add a day off, save. Then open `/booking`, choose Haircut and a Monday: time slots appear and none at 12:00. Change the hours and confirm the slots change at once. Try an off-grid time (09:10) and an empty services list: both are refused with a message. Turn the barber off: no slots for him; turn on again. Tick "Show on the website" with a role and confirm the home team section shows his name. Customers and signed-out visitors get a 404 on `/admin/barbers`. Check `auditLog` for `catalog.barber.*`. This is also the first time real booking slots can exist: after it, run the Atlas race tests from the "Manual verification after user-authorized seed" list above. Automated coverage: `src/lib/catalog/barber-input.test.js`, `admin-barbers.test.js`, `src/app/admin/barbers/actions.test.js`.

## Business settings (I-7)

Manual check as an enrolled Admin (dev database): open `/admin/settings`. Contact: enter a phone, an email and a street address with a postal code, save; `/contact` and the footer now show them and the Maps link appears in the Find us card (no empty fields shown). Social: add an Instagram link; try `http://instagram.com/x`, `javascript:alert(1)` and a Facebook link in the Instagram field (all refused). Hours: untick Sunday, save: `/contact` and the footer lose Sunday and `/booking` offers no Sunday slots. Closed dates: add a date a week ahead, save: that date has no slots and `/contact` lists it under closed days. Restore everything afterwards. Customers and signed-out visitors get a 404 on `/admin/settings`. Check `auditLog` for `catalog.settings.*_updated` events (no contact values inside). Automated coverage: `src/lib/catalog/settings*.test.js`, `admin-settings.test.js`, `src/app/admin/settings/actions.test.js`.

## Customer dashboard (I-8)

Done live by the assistant on a production build with a dummy customer (email on the reserved `.invalid` domain so no mail can be delivered): sign-up lands on `/user` with real zeros and an empty state; a booking made through the booking API appears as the next appointment with Reschedule and Cancel; rescheduling through the panel (new date, time chips) moved it and showed a toast; cancelling asked for confirmation, then moved it to history. Not exercised live: the 24-hour cutoff in the UI (covered by unit tests and the repository's own tests), another customer trying to act on this booking (repository ownership test), the emails. To check the cutoff by hand: book a slot less than 24 hours ahead and confirm /user shows no buttons and the "contact the shop" note. Automated coverage: `src/lib/booking/user-bookings.test.js`, `src/app/user/actions.test.js`.

## Profile page (I-9)

Done live by the assistant on a production build with dummy `dummy-i9@example.invalid` and a second session made with another user-agent: both sessions listed ("This device" first, device labels, no tokens); name saved with a toast; invalid name rejected inline; "Sign out" on the other device removed it; a wrong current password showed a field error and changed nothing; a correct change made the old password fail and the new one work, signed this browser out and landed on /sign-in (no redirect loop). Not checked: mobile layout of this page (uses the same shared classes as I-8, which was checked at 375 px), the "Sign out all other devices" button, and an admin using the page. Note: the sign-in rate limit (429) fired during my repeated sign-in attempts, which is expected behaviour. Automated: `src/lib/account/account-input.test.js`, `src/app/user/profile/actions.test.js`.

## Avatar and deletion request (I-10)

Checked live (production build, dummy `dummy-i10@example.invalid`): the profile page shows the photo panel (initial letter placeholder), removing a photo with none set is harmless, a wrong confirmation email is rejected inline, the right one (any letter case) creates the request and the page switches to the "You asked the shop" state, "Cancel my request" returns the form, and at 375 px the page does not overflow. **Not verified: an actual photo upload.** The ImgBB step returned `imgbb_upload_failed` with the key in your local environment (a missing, placeholder or invalid `IMGBB_API_KEY`, or ImgBB being unreachable); the user saw the friendly error. To check by hand: set a valid key, open /user/profile, choose a small JPG, confirm the round photo appears, choose another (the old one disappears from ImgBB records), then Remove photo.

## Admin bookings (I-11)

Checked by the assistant on a production build: a guest and a signed-in customer both get 404 for /admin/bookings (with and without a date). **Not exercised live:** the screen itself, because it needs an admin with two-step verification and role grants are the owner's decision. Please check it as an admin: (1) open Admin > Bookings, today's list and counts show; (2) make a test booking for a few minutes from now and a second for later; (3) the later one only offers Cancel; Cancel asks "Cancel and email the customer?", then moves it to Cancelled and the customer gets an email; (4) once the start time has passed the first offers Mark completed, and Mark no-show after the late-arrival grace (10 minutes); (5) Previous/Next day and the date picker work; (6) at 375 px the table scrolls inside its box. Automated coverage: `admin-bookings.test.js`, the admin cases in `repository.test.js`, `app/admin/bookings/actions.test.js`.

## All bookings search (I-12)

Automated only (fake database); the screen needs an admin with two-step verification, so it was not exercised live. Please check as an admin at Admin > Bookings > All bookings: (1) the list shows newest appointments first with the same Confirm/Complete/Cancel buttons as the day view; (2) search a customer's first letters, then their phone number with spaces or dashes, then a booking number copied from a URL or the database; (3) filter by status, by barber and by a date range, and combine them; (4) with more than 25 bookings, Next and Previous keep your filters; (5) a nonsense search shows "No bookings match" and Clear filters resets; (6) at 375 px the filter fields stack and the table scrolls inside its box.

## Walk-in booking (I-13)

Automated (fake database): booking with no account, no lead-time or cap, taken slot refused, bad phone refused, walk-in no-show with no account, availability starting now. Live: guest and customer get 404 on /admin/bookings/walk-in. **Not exercised live as an admin.** Please check as an admin: (1) Bookings > New walk-in; (2) enter a name, tick a service, pick today and a barber, times appear and the first slot is not in the past; (3) Book walk-in returns to today's list with a "Walk-in" tag, status Confirmed; (4) try the same slot as an online customer: it is gone; (5) later, Mark completed works; Cancel does not try to send an email; (6) at 375 px the form stacks and the time chips wrap.

## Customers list (I-14)

Automated with fakes (parsing, escaping, limited fields, statistics join, empty page). Live: guest and customer get 404 on /admin/customers. **Not exercised live as an admin.** Please check as an admin: (1) Admin > Customers lists your test accounts newest first with join date, booking counts (e.g. "2 (1 completed)") and last visit; (2) search by part of a name and of an email; (3) "Flagged for review" shows customers with 2 or more no-shows; (4) a customer who asked for deletion in their profile shows a "Deletion requested" badge; (5) no phone numbers, roles or edit buttons appear; (6) at 375 px the table scrolls inside its box.

## Contact messages (I-20)

Automated with fakes (filters, escaping, list and single read, status change and delete with audit, Admin refused on delete). Live (earlier unit, still true): guest and customer get 404 on admin pages. **Not exercised live as an admin.** Please check: (1) send a message from /contact (needs the spam check configured); (2) Admin > Messages shows it as New and the "New messages" counter goes up; (3) open it: full text, Reply by email opens your mail program addressed to the customer, delivery status shown; (4) Mark as replied, list shows Replied and the counter goes down; (5) search for part of the text; (6) Delete (Admin or Super Admin) asks to confirm, then removes the message and returns to the list; (7) at 375 px the page does not overflow.

## Gallery manager (I-19)

Automated with fakes (input rules, public normalization and merge, data layer, actions). Live: guest and customer get 404 on /admin/gallery (see the unit report). **Not exercised live as an admin, and no real upload was tried**: the ImgBB key in the local environment was rejected during the avatar test (I-10), so check `IMGBB_API_KEY` first (name only). Please check as an admin: (1) Admin > Gallery shows 0 photos and the built-in gallery still shows on /gallery; (2) add a JPG with a title, category and description; it appears in "Your photos" and, within about five minutes (immediately after the next save), at the top of /gallery with the concept images gone; (3) Edit changes title, category and description; (4) Hide removes it from /gallery, Show brings it back; (5) Delete asks to confirm, removes it from the list and from ImgBB; (6) a 6 MB file and a .txt renamed to .jpg are refused with a clear message; (7) at 375 px the cards stack.

## Image storage on Cloudinary (C1)

Automated: `npm test` (signature determinism and secret never in output, fixed folders, upload and delete requests against a mock `fetch`, bad provider responses, role matrix, spoofed MIME and renamed program files, 4 MB cap, EXIF and GPS stripped, rate limit and permission checks on `/api/media`, no secret in client files). Manual, once you have set the four variables in `.env` (values stay with you): run `npm run check:cloudinary`. Expected output is one line: `SUCCESS: uploaded a 1x1 test image to the-cut/_test and deleted it again.` On failure it prints `FAILURE:` and a code such as `missing_variables`, `provider_rejected_credentials (HTTP 401)` (wrong key, secret or cloud name) or `provider_unreachable`. Nothing secret is printed. Full live checklist: C2.

## Live test checklist for image uploads (C2)

Set the four variables in `.env`, restart, rebuild.
1. `npm run check:cloudinary` prints SUCCESS. In Cloudinary Media Library > the-cut > `_test` the 1x1 file is gone (the folder may stay).
2. Sign in as ADMIN > Admin > Gallery > add a 6 MB photo: it is shrunk in the browser and accepted. In Cloudinary: the-cut/gallery has one new file with a random name, WebP, about 2000 px or less. Open /gallery: the photo shows first. Hide it: it disappears from /gallery.
3. Delete it in Admin > Gallery: it is gone from the list and from Cloudinary (the-cut/gallery).
4. Sign in as USER > Profile > Profile photo > upload a small JPG: it shows; one file in the-cut/avatars. Upload another: still one file (the old one is deleted). Remove photo: the folder is empty.
5. As USER open /admin/gallery: 404. In the browser console run `fetch('/api/admin/gallery',{method:'POST',body:new FormData()})`: 401 or 403, never an upload.
6. Try a file over 4 MB that cannot be shrunk (a very large AVIF/PNG the browser cannot decode): toast "too large". Try a .exe renamed to .jpg: toast "wrong type". Nothing appears in Cloudinary for either.
7. Upload the same small photo as USER more than 10 times in an hour: toast "Too many attempts" (rate limit); check Admin > audit later for `media.uploaded` entries.
8. Open the public pages with the browser's Network tab: image requests go to `/_next/image?...&w=<one of 96,160,320,480,640,768,1080,1440,1920>&q=75`, never another width, and none to a raw `res.cloudinary.com` URL on public pages.
Delete afterwards: any leftover files in the-cut/* in Cloudinary, the dummy test accounts, and the `media`, `galleryItem` and `auditLog` test records in the dev database.

## Operational reports (I-22)

Automated with fakes (range parsing, bounds in New York time including the November clock change, the aggregation pipeline, rates without division by zero, no money or personal data in the output). Live: guest and customer get 404 on /admin/reports. **Not exercised live as an admin.** Please check as an admin: (1) Admin > Reports opens with "Last 30 days"; (2) switch to 7 days, 90 days and "Next 7 days" (the heading dates change); (3) numbers match what you see in Admin > All bookings for the same period (total, completed, cancelled, no-show); (4) a walk-in booking is counted under "walk-in"; (5) a cancelled booking is counted in the cancellation rate but not under the barber or service lists; (6) with no bookings the page says "No bookings in this period" and shows "No data" for rates; (7) at 375 px the bars and table fit.

## Pictures for services, barbers and packages (D1)

Automated (mock storage and fake database): attach, replace, remove, orphan flag when the provider refuses, alt-only update, picture permission matrix (ADMIN and SUPER_ADMIN allowed; USER, guest and no role denied), alt text required, another record's or another kind's media refused, pending upload discard and stale sweep, save order (the picture is attached only after the record saved), fallback when no picture, public data without the media id. **Not exercised live** (needs your Cloudinary values, a rebuild and an admin login). Please check as ADMIN: (1) Admin > Services > New: drop a photo, move the crop sliders, "Use this picture", add a description, create: the card on /services and the home page shows it in a 4:3 shape; (2) Edit it, Replace picture with another, save: the page shows the new one and the old file is gone from Cloudinary (the-cut/services); (3) Remove picture, save: the site goes back to the built-in image and the file is gone from Cloudinary; (4) try a description of 2 letters: "Describe the picture" error and nothing saved; (5) upload then leave the page without saving: the unsaved file stays in Cloudinary for up to a day and is swept at the next upload; (6) repeat quickly for Barbers (4:5 portrait on the home page) and Packages (card image on /pricing); (7) as USER: `fetch('/api/admin/catalog-image',{method:'POST',body:new FormData()})` is refused (401, 403 or 400, never an upload).

## Admin capabilities (P1)

Automated: `config/admin-capabilities.test.js` (catalog integrity, defaults, tampered documents, view-off disables the group, any-of, input validation), `lib/auth/capabilities.test.js` (Super Admin never limited, revoke applies on the next check, fail closed, save validation and audit counts), `lib/auth/capability-enforcement.test.js` (`requirePrincipal` and the page guard with a revoked capability; Super Admin unaffected; TOTP and status rules unchanged; an Admin never opens Super Admin pages), `lib/auth/capability-coverage.test.js` (no admin action, API route or page without its capability; every id known; every route has its page), and the updated action and route tests that assert the exact capability each call needs. **Not live-verified:** there is no screen to change a switch until P2. A manual check before P2 is possible only by editing the `adminPermission` document in Atlas (do this on the dev database only): set `grants["messages.delete"] = false`, then as ADMIN try to delete a message (refused), and set it back.

## Admin permission screen (P2)

Automated: `app/super-admin/permissions/actions.test.js` (Super Admin only, rate limit, step-up required and nothing written without it, saves as the signed-in Super Admin, invalid input, rethrow), `lib/auth/capabilities.test.js` (effective capabilities for Super Admin, Admin, customer and on failure; last-saved details), `config/dashboard-nav.test.js` (menu follows the switches), `lib/booking/admin-bookings.test.js` (status buttons follow the switches), `lib/auth/capability-coverage.test.js` (the permission screen order and that it is not an Admin route). **Not live-verified.** Live checklist: (1) as SUPER_ADMIN open Super admin > Admin permissions: every box is ticked and the note says nothing was ever saved; (2) untick "Delete messages", press Save changes: it asks for your 6-digit authenticator code; enter it, "Admin permissions saved" appears, and the page says "Last saved ... change number 1"; (3) as ADMIN (another browser) open a message without signing out again: the Delete button is gone; (4) as ADMIN try the old way (browser console is not needed) by reloading the message page: still no Delete, and "Mark as replied" still works; (5) as SUPER_ADMIN untick Reports, save; as ADMIN reload: the Reports menu item is gone after a page reload, and /admin/reports is a 404; (6) untick "View bookings", save: as ADMIN /admin/bookings is a 404 and its menu item disappears after reload; (7) untick Settings "Edit": as ADMIN /admin/settings opens read-only with a note; (8) press "Switch everything on", save, confirm everything is back for the ADMIN; (9) as ADMIN open /super-admin/permissions: 404; (10) untick "Cancel bookings" only: an Admin no longer sees Cancel on a booking (a future confirmed booking then shows "No changes"), while Complete and Mark no-show still appear once their time has come. Check the audit trail entry later in the audit viewer (I-24).

## Barber picture fix (2026-10-30)

Automated: `app/admin/barbers/picture-flow.test.js` (the real save path: the form fields `imageMediaId` and `imageAlt` end up on the barber for edit and create; a save with no upload attaches nothing; a picture without a description saves nothing), `CatalogThumb.test.jsx` (admin list picture and fallback), `catalog-images.test.js` (description suggestions). **Browser check done on a production build against a throw-away database `the_cut_test`** (never `the_cut`): two public barbers, one with the real uploaded Cloudinary portrait, one without. Results: the picture loads through `/_next/image` (HTTP 200, width 320 from the fixed list, quality 75), its alt text is the stored description, the "Shared sample image" label is gone on it, and the barber without a picture shows the placeholder and the label. **Not verified in a browser: the admin dashboard** (needs an admin login). Please check as ADMIN: (1) Admin > Barbers shows a Picture column (a letter for barbers with none); (2) edit a barber, choose a portrait, "Use this picture and save" (or "Use this picture", then Save changes); after saving, the list shows the thumbnail and the home page shows the portrait within about five minutes (immediately after the next save, because saving refreshes the cache); (3) leave the form after "Use this picture" without saving: the browser warns you.

## Phase 1 live check as Super Admin (2026-10-30, dev server :3000, signed in by the owner)

PASS in the browser: all 19 pages (/admin, bookings x3, customers, services x2, packages x2, barbers/new, gallery, messages, reports, settings, /super-admin, /super-admin/permissions, /user x3) answered 200 with no error text; /admin/barbers shows the Picture column (Daniel Carter thumbnail loads from Cloudinary through /_next/image with the stored description as alt, letters for the other four); the Daniel Carter edit form shows the saved picture (lazy loaded), the description and "Remove picture"/"Replace picture"; no console errors. **Bug found and fixed:** the Booking badge said "Bookable" for every active barber, including three with no working hours (the stat cards were right). It now says "No hours" for those. **Not verified:** anything as a real ADMIN (the Super Admin is never limited by the switches), saving a picture from the form, adding a barber with a picture, the permission screen's toggles, the packages list picture column (none exists).

## Live Admin permission test (2026-10-30, dev server :3000, owner signed in and switched accounts in one tab; switches changed only through the real Super Admin screen)
| Step | Account | Result |
|---|---|---|
| 1 Super Admin screen shows 26 of 26 on | Super Admin | PASS |
| 2 All on: 16 admin pages open, sidebar has 10 entries, upload APIs pass the switch (400 for a dummy file), /super-admin pages 404, Barbers shows Edit and Turn off | Admin | PASS |
| 3 Barbers View off (screen turns its Create and Edit off too) saved | Super Admin | PASS (saved, change 2) |
| 4 Barbers entry gone, /admin/barbers, /new and /daniel-carter show 404, barber picture upload 403, other sections and uploads work | Admin | PASS (note: denied pages answer HTTP 200 with the 404 view) |
| 5 View and Create on, Edit off saved | Super Admin | PASS (change 3) |
| 6 List opens with pictures, rows say "View only", no Edit or Turn off, edit page 404, New barber still works | Admin | PASS |
| 7 All 26 off saved | Super Admin | PASS (change 4) |
| 8 Only Overview in the sidebar, overview opens, Bookings and Settings show 404, all four upload APIs 403, /super-admin 404 | Admin | PASS |
| 9 "Switch everything on" saved, reloaded: 26 of 26, stored record 26 on | Super Admin | PASS (change 5) |
| 10 Sidebar full again, all 16 pages open, uploads pass the switch, /super-admin 404, no sign-out needed | Admin | PASS |
**FAIL / finding:** the "Site images (API only)" row of the review text says "nothing" even with all 26 on (see ADMIN_PERMISSIONS.md, Known issues). **Not live-tested:** calling Server Actions directly (covered by capability-coverage.test.js), a customer (USER) account, production build behaviour of the denied-page status code, the authenticator prompt (the screen did not ask for a code because the sign-in was recent). Automated: 701 tests pass.

## Fix check: site images switch and real HTTP 404 (2026-10-30, dev server :3000, same account-switching method; switches changed only through the real Super Admin screen)
Automated: 712 tests pass in 86 files (new: site images allowed/denied/default-deny, all three upload targets, Super Admin unlimited, review text, `capabilityForAdminPath` for every route, `layout.test.js`, proxy header scan), lint clean, `npm run build` compiled. Live as the real Admin: all 26 on: 16 admin pages 200, `/super-admin` pages and `/admin/nothing-here` 404, `/api/media` banners, slots, products pass the switch (400 for a dummy file, not 403). Barbers View and Site images off (change 6): `/admin/barbers`, `/new`, `/daniel-carter` **HTTP 404** (was 200), page body has no barber data and the title is generic, `/api/media` banners, slots, products **403**, the other 13 admin pages 200, sidebar without Barbers. Restored through the screen: 26 of 26 on (change 7, stored record confirmed), review text "Site images: Upload banner, slot and product images". **Not tested:** production build served live (build compiles; dev server tested), real image uploads to Cloudinary through /api/media (dummy file only), a customer account, direct Server Action calls (covered by capability-coverage.test.js).

## D2a archive and restore (2026-10-31)
Automated: `lib/catalog/archive.test.js` (archive, restore, barber block and which bookings count, double archive, lists, read-only archived records, reserved slug, public hide), `app/admin/archive-actions.test.js` (all three kinds: own switch, denied, bad slug, rate limit, repository refusal, barber message), `lib/booking/seed-archived.test.js` (seed cannot bring an archived record back), capability tests (6 new switches, default deny, independence from Edit, 32 total); existing repository tests updated for the `$exists` filter. Totals: 747 tests, lint clean, `npm run build` compiled. Live test: see the next section.

## D2a live test (2026-10-30 evening, dev server :3000, real Super Admin and Admin, owner signed in at each switch; switches changed only through the real screen)
| Step | Account | Result |
|---|---|---|
| Permission screen shows 32 switches incl. the 6 new ones; "Switch everything on" saved (change 10) | Super Admin | PASS |
| Archive Daniel Carter (1 upcoming booking) | Super Admin | PASS: refused with the count, nothing changed |
| Archive, Archived tab, read-only edit page, restore (comes back Off/hidden), turn on again: barber James Miller | Super Admin | PASS |
| Archive, restore, re-tick Popular: package "cut" (slug jjjjj) | Super Admin | PASS (note: archive clears the Popular badge, restore does not bring it back; I re-ticked it) |
| Archive Hair Treatment: leaves Active, public /services stops listing it; restore: still hidden on the public site until turned on | Super Admin | PASS |
| All 32 on: Admin sees Archive buttons and Archived tabs, archives Hair Treatment, archived edit page is a notice (no form), public site hides it, archive of Daniel Carter refused | Admin | PASS |
| Restore archived services and Archive packages switched off (change 11): archived row says "View only", Packages list has no Archive button but keeps Edit and Hide, Services and Barbers keep Archive | Admin | PASS |
| Everything on again (change 12), Hair Treatment restored and turned on: Shown, public site lists it | Super Admin | PASS |
Data integrity (read-only): no archived record left, 2 bookings and 3 media documents unchanged, Daniel Carter's picture still attached, audit log has the 8 archive and restore events, final switches 32 of 32 on. **Not live-tested:** direct Server Action calls (unit tests cover them), a customer account, booking a service while it is archived (public hiding was checked, and the booking engine filters active records), production build served live, permanent delete (not built). Note: the owner had switched the Services, Packages and Barbers View switches off (changes 8 and 9) before this test; the test left everything on, per the plan.

## Walk-in booking fix (2026-10-31, branch feature/live-fixes; dev server :3000, real Admin session typed by the owner)
**Reported:** pressing Save on /admin/bookings/walk-in showed the dashboard error panel "Something went wrong". **Reproduction:** one fake walk-in ("Test Walkin", Beard Trim, Daniel Carter, 3:00 PM) saved on the first try, appeared in Today's bookings as WALK-IN with status Confirmed, and the page moved to /admin/bookings. The first failure was therefore **not reproducible**; the booking code also ran cleanly against a copy of the real services and barbers in the throw-away database the_cut_test (24 free times, booking created, copy removed). **Most likely cause (not proven):** the request to the server did not complete (dev server compiling or restarting, or the page was older than the server code); the form did not catch a failed request, so the error boundary replaced the whole section.
**Changes:** the form now catches a failed request and shows "The server did not answer. The walk-in may or may not have been saved: check Today's bookings first..." (no error panel); a failed free-times request shows a message and a Try again button; Save is locked the instant it is pressed; the server refuses the same admin booking the same name and time within a minute (`duplicate_request`); unexpected server errors in the walk-in actions return a safe message and write one log line (`lib/utils/log-error.js`: name, code, message, short stack; emails and phone numbers blanked); the dashboard error panel now says the server may have been slow or restarting and logs one line in the browser console (name, message, digest).
**Tests:** log-error.test.js, walk-in actions.test.js (no phone, bad phone, taken slot, repeated click, switch off, unauthenticated, unexpected error with no personal data in the log, failing rate limit), repository.test.js (double Save books once; another admin or two minutes later is judged on the slot alone), DashboardError.test.jsx (message, no details shown, error passed on, form guards present). 756 tests pass in 90 files, lint clean, build compiled.
**Live (same session):** free times load; a simulated failed request shows the new message and no error panel; pressing Save twice sent one request; the fake booking was cancelled from the dashboard (status Cancelled). **Not verified live:** a real server error (none could be produced), the cancel email (a walk-in has no email address). **Test record to remove (optional):** the cancelled booking "Test Walkin" (3:00 PM, Beard Trim, Daniel Carter, 2026-10-31); bookings are never deleted from the dashboard.
