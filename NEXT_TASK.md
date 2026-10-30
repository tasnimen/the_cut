# Next task

**Status (2026-10-30):** Phase I units I-1 to I-17, I-19, I-20, I-22, the Cloudinary switch (C1, C2) and D1 (pictures) are built and tested (642 tests). The admin screens have not been tried live as an admin. See `docs/PROGRESS.md`.

Pending, in this order:
0. **Owner, barber pictures:** the pending portrait was attached to Daniel Carter on 2026-10-30 (owner's decision; seen on the public site). The other four barbers (James Miller, Robert Wilson, Michael Brown, wfoijwfnwfe) still have no picture: open Admin > Barbers > Edit for each, choose the picture, press "Use this picture and save". Check the Admin > Barbers Picture column as ADMIN (not yet verified in a browser). See `docs/TESTING.md`, "Barber picture fix".
1. **Owner:** set the correct `CLOUDINARY_CLOUD_NAME` in `.env` (the check with the name `swthle87` printed SUCCESS), restart, rebuild, run `npm run check:cloudinary`.
2. **Owner:** live-test the admin side (checklist given in chat; steps also in `docs/TESTING.md`) and report results. Nothing new is built on untested admin screens until then, unless the owner says so.
3. **Owner:** live-test the permission screen (checklist in `docs/TESTING.md`, "Admin permission screen (P2)") together with the admin checklist; report what you see.
4. Unit D2 (archive, restore, delete everywhere), built on the capabilities (add `archive` and `delete` capabilities as the features are built). The open question about message deletion is now the switch `messages.delete`.
5. Super Admin units I-23 (admin accounts), I-24 (audit viewer), I-25 (security settings), I-26 (revenue, CSV), I-27 (image slot screen); then hardening I-28 to I-30.
6. Diagnose the home hero image on the live site (needs the live address, the host and the network status of the `banner1` request).

Rules for every task: one unit per owner "ok"; commit blocks with explicit `git add <paths>`; update the documentation (see CLAUDE.md "Documentation").
