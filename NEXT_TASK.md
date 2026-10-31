# Next task

**Status (2026-10-31):** 849 tests (plus one opt-in live race test, skipped by default), lint and build clean at the last run. Stages A, B and C are merged into `main`; Stage D (availability control, docs/AVAILABILITY.md) is built and live-verified as Super Admin. Full status: `docs/PROJECT_STATUS.md`.

Pending, in this order:
1. **Owner:** the Admin role was not tried live for Stage D (the five new switches are off by default): turn them on in Super Admin > Admin permissions and check /admin/schedule as Admin; with them off it must be a 404.
2. **Owner:** set the correct `CLOUDINARY_CLOUD_NAME` in `.env` (the name `swthle87` printed SUCCESS), restart, rebuild, run `npm run check:cloudinary`.
3. **Owner:** live-test the admin actions not yet tried (walk-in booking now done) (checklist in the housekeeping report and `docs/TESTING.md`): booking status changes, walk-in, customers, messages, gallery, settings, reports, avatar, reschedule and cancel emails.
4. **Owner:** pictures for the other four barbers (Admin > Barbers > Edit > "Use this picture and save"); remove the test records (list in the housekeeping report).
5. Unit D2b (gallery photos and messages archive and restore, Super Admin permanent delete, removal of the Admin `gallery.delete` and `messages.delete` switches) needs the owner's ok.
6. Super Admin units I-23 (admin accounts), I-24 (audit viewer), I-25 (security settings), I-26 (revenue, CSV), I-27 (image slot screen); then hardening I-28 to I-30.
7. Wish list, none started: offers, content manager, dashboard redesign, shop, real reviews (see `docs/PROJECT_STATUS.md`, section 5).
8. Stage C is built (docs/EMAIL.md). Owner: verify the sender domain (SPF, DKIM, DMARC) and change `MAIL_FROM` so customers receive mail; pick a scheduler for the hourly job (`docs/REMINDERS.md`). Stage D is built. Stage E is done: pick proposals from docs/BOOKING_GAPS.md.
9. Home hero image on the live site: not reproducible locally (see `docs/AI_HANDOFF.md`); needs the live address and the failing request.

Rules for every task: one unit per owner "ok"; commit blocks with explicit `git add <paths>`; update the documentation (see CLAUDE.md "Documentation").
