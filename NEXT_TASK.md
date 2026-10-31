# Next task

**Status (2026-10-31):** 747 tests, lint and build clean at the last run. D2a (archive and restore) is built, live-verified, committed and pushed on `feature/d2-archive-restore`. Full status: `docs/PROJECT_STATUS.md`.

Pending, in this order:
1. **Owner:** merge the work into a `main` branch (the remote has no `main` yet; steps in the housekeeping report), then continue.
2. **Owner:** set the correct `CLOUDINARY_CLOUD_NAME` in `.env` (the name `swthle87` printed SUCCESS), restart, rebuild, run `npm run check:cloudinary`.
3. **Owner:** live-test the admin actions not yet tried (walk-in booking now done) (checklist in the housekeeping report and `docs/TESTING.md`): booking status changes, walk-in, customers, messages, gallery, settings, reports, avatar, reschedule and cancel emails.
4. **Owner:** pictures for the other four barbers (Admin > Barbers > Edit > "Use this picture and save"); remove the test records (list in the housekeeping report).
5. Unit D2b (gallery photos and messages archive and restore, Super Admin permanent delete, removal of the Admin `gallery.delete` and `messages.delete` switches) needs the owner's ok.
6. Super Admin units I-23 (admin accounts), I-24 (audit viewer), I-25 (security settings), I-26 (revenue, CSV), I-27 (image slot screen); then hardening I-28 to I-30.
7. Wish list, none started: offers, content manager, dashboard redesign, shop, real reviews (see `docs/PROJECT_STATUS.md`, section 5).
8. Stage C (booking emails) waits for the owner's "start"; set `REMINDER_JOB_SECRET` and pick a scheduler (`docs/REMINDERS.md`) when mail can reach customers.
9. Home hero image on the live site: not reproducible locally (see `docs/AI_HANDOFF.md`); needs the live address and the failing request.

Rules for every task: one unit per owner "ok"; commit blocks with explicit `git add <paths>`; update the documentation (see CLAUDE.md "Documentation").
