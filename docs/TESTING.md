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
