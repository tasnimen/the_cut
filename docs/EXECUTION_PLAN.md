# Execution plan (stages A to E)

Written 2026-10-31. Each stage ends with updated `docs/AI_HANDOFF.md` and `CLAUDE.md`, a commit and push on its own branch, a merge into `main` with `--ff-only` after tests, lint and build pass (the commit id `main` was at is reported before the merge), a report of at most 12 lines, and a STOP until the owner writes "start". Sizes: S small, M medium, L large (estimates, not promises).

## Rules that apply to every stage
| Rule | Detail |
|---|---|
| Git | The assistant runs git (explicit `git add` paths, no force push, no history rewrite, no branch deletion); one branch per stage from `main` |
| Sign-in | The owner signs in as USER, Admin or Super Admin in the browser pane, one role at a time; passwords and codes are never asked for, read or stored |
| Fake data | Test records use obviously fake names ("Test ..." and phone +1 212 555 01xx, email test+x@example.com), are listed in `docs/TEST_DATA_CLEANUP.md` while the stage runs, and are removed through the app before the stage ends |
| Security | Server-side authorization on every action, ownership scoping, strict Zod, rate limits, audit log, real 404 for denied pages, generic errors; new Admin switches default to off and go into `config/admin-capabilities.js` and `docs/ROLE_PERMISSIONS.md` |
| Honesty | "Not verified" unless run live; done means code exists and was checked as stated |

## Stage A: full QA audit (no code changes)
Branch: `docs/qa-audit` (docs only). Output: `docs/QA_REPORT.md`, a PASS, FAIL or BLOCKED list with severity.

| Unit | Size | Goal |
|---|---|---|
| A1 Public site | M | Every page, button and link (BUTTON_MAP as checklist), forms and errors, filters, gallery dialog, mobile menu, images, console, 404, robots and sitemap, titles and meta, layout at 1440, 768 and 375 px, keyboard focus |
| A2 USER | M | Dummy account: sign-up, sign-in and out, avatar menu, booking end to end, appointments (reschedule, cancel, 24 h rule), profile, password, sessions, avatar, blocked from /admin and /super-admin |
| A3 Admin | L | Every screen and action including walk-in (reproduce the known error and capture the real server error), messages, gallery, services, packages, barbers, settings, reports; a switched-off permission hides the button and the server rejects a direct request |
| A4 Super Admin | S | Overview, permission screen follows on the Admin side, everything the Admin can do |
| A5 Email review | S | Read what the code sends and when, failure handling, texts; list gaps; no mail to arbitrary addresses |
| A6 Report and cleanup | S | Group the table by area, list created test records, remove them in the app, commit docs, 12-line summary |

## Stage B: fix the problems
Branch: `feature/qa-fixes` (continues `feature/live-fixes`, which holds 2 unmerged commits: the walk-in hardening).

| Unit | Size | Goal |
|---|---|---|
| B1 Walk-in root cause | S | Reproduce with the dev terminal, fix at the root, regression test |
| B2 Critical and High items | L | One fix each: root cause in one line, smallest shared change, regression test, live re-check |
| B3 Medium items | M | Same method; Low items are listed for the owner, not fixed |
| B4 Error boundaries | S | One safe log line wherever the boundary swallows an error; useful panel with Retry on all three dashboard areas |
| B5 Wrap-up | S | Update QA_REPORT statuses, full tests, lint, build, merge |

## Stage C: booking emails
Branch: `feature/booking-emails`. Reuses the Nodemailer layer and `after()`; booking never waits for mail.

| Unit | Size | Goal |
|---|---|---|
| C1 Layout and templates | M | One branded, responsive, escaped layout with a plain-text twin; per-event templates in `lib/mail/templates`; times in the shop time zone with abbreviation; address, phone, 24 h policy, Manage button, price before tax |
| C2 Events and recipients | M | Received, confirmed, new-booking notice to the shop, cancelled by customer or shop (with reason), rescheduled, completed, no-show, walk-in (only if an email exists) |
| C3 Delivery safety | M | Mail log collection, idempotency key per event, retry with backoff, failure never blocks the booking, audit entry on failure, no sensitive data in logs |
| C4 Calendar file | S | `.ics` with correct time zone, UID, update and cancel semantics |
| C5 Reminders | M | Secured endpoint (secret env variable, name added to `.env.example`) for an hourly scheduler, 23 to 25 hours before, idempotent; dev script; two scheduling options documented for the owner |
| C6 Email log screen | M | Super Admin list (Admin only through a new default-off switch) with status, event, time and an idempotent Resend button |
| C7 Dev preview | S | Dev-only page rendering every template with fake data; never in production builds |
| C8 Tests and live check | M | Mock transport tests (events, recipients, idempotency, escaping, time zone and DST, .ics, retry, failure isolation); one real email to the account owner only |

Note: until the sender domain is verified (SPF, DKIM, DMARC) mail to customers is not delivered by the test sender; the code works once the domain is verified and `MAIL_FROM` is changed.

## Stage D: availability control
Branch: `feature/availability-control`.

| Unit | Size | Goal |
|---|---|---|
| D1 One availability function | L | A single function for the public API, walk-in, reschedule and the admin calendar; DST and America/New_York correct; revalidation after changes |
| D2 Block model | M | Blocks (barber or all, start and end in UTC, reason, creator, status) with range indexes |
| D3 Booking page states | L | Disabled dates, slots, barbers and services with reasons, grouped chips, legend, tooltips, next available time, skeletons, empty and error states, refresh on focus and after a conflict, 375 px and keyboard |
| D4 Accepting-bookings and service switches | M | Barber toggle with optional until date and note (lists upcoming bookings), service bookable switch, new default-off switches, audit |
| D5 Block time screens | M | Create, list, edit and unblock blocks (barber or all, date range, whole day), overlap refused with the conflict list |
| D6 Schedule calendar | L | Day and week grid per barber with bookings, blocks, breaks and free time; click to open, walk-in or block; responsive and keyboard accessible |
| D7 Release actions | M | Complete early, Release time, Reopen slot with confirmation; cancel and no-show release automatically |
| D8 Tests | M | Per-reason disabled states, block and unblock, overlap, releases, parallel race on `the_cut_test` (exactly one wins), DST days, switches off, role matrix, real 404, IDOR, price tampering |
| D9 Live check | S | In the pane, then merge |

## Stage E: complete the booking experience
Branch: `feature/booking-complete`. First `docs/BOOKING_GAPS.md` (S, M or L per gap, from the code and docs); S and M items are built in order, L items stay proposals. Out of scope without approval: online payment, deposits, SMS, waitlist, recurring bookings.

| Unit | Size | Goal |
|---|---|---|
| E1 Gap list | S | Compare against an industry-level system using the code; candidates: confirm mode, cancel with reason, 24 h override with reason, price snapshot on reschedule, customer and staff notes, no-show counter and flag, history and receipt with `.ics`, Book again and Favorite barber, phone rules, endpoint rate limits, max active bookings, confirmation page, report counts, empty, loading and error states, overview widgets with real numbers |
| E2 Build the S and M items | M to L | In order, each with tests |
| E3 Docs and live check | S | `BOOKING_RULES.md`, `TESTING.md`, `ROLE_PERMISSIONS.md`, live check, merge |

## Totals (estimate)
| Stage | Units | Sizes |
|---|---|---|
| A | 6 | 1 L, 2 M, 3 S |
| B | 5 | 1 L, 1 M, 3 S |
| C | 8 | 6 M, 2 S |
| D | 9 | 3 L, 5 M, 1 S |
| E | 3 | about 1 L to M, 2 S, depends on the gap list |
| All | about 31 | about 6 L, 14 M, 11 S |

## Defaults (change by saying so)
| Question | Default |
|---|---|
| Merge `feature/live-fixes` into `main` | At the start of Stage B (tests, lint and build already passed on it) |
| Who sees the Email log | Super Admin only until a new switch is turned on |
| Reminder scheduler | Two options will be documented in Stage C; none is assumed |

**Stage D status (2026-10-31):** built and live-verified as Super Admin; see docs/AVAILABILITY.md for what was built and what was deliberately not (block edit screen, separate release buttons).
