# Next task: confirm barber schedules and run post-seed checks

**Status:** The read-only preflight completed on 2026-10-29 against `the_cut`: 6 service inserts and 4 barber inserts, no ambiguity, no warnings. Connectivity is working. Nothing has been written. Phase H and Phase I are not started.

Next, in order:
1. Seed applied 2026-10-29 (6 services, 4 barbers). Verify records in Atlas and the /booking UI.
2. **User input:** real barber names, weekly schedules, holidays and hours. Barbers are seeded with empty schedules, so no availability appears until these are set.
3. Run the manual post-seed checks in `docs/TESTING.md`, including a real sign-in and sign-out check of the navbar with a verified test account and the Atlas race tests.
4. Finish the design pass: compare Home, About, Services, Pricing, Booking and Contact against the references at true desktop width, and resolve the open rows in `docs/REFERENCE_DESIGN_AUDIT.md` (hero headline style, Dhaka vs New York location, pricing tiers vs six-service catalog).

Checks last run: `npm test` 232 passed (18 files); lint 0 errors, one existing HeroSection warning; `npm run build` passed. No commit was made.
