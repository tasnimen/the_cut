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
