# QA report (Stage A audit, 2026-10-31)

Scope: everything that exists, tested in the browser pane against a production build of `main` (`next start -p 3002`, fast, with its server log readable) and, for the sign-in checks, against the dev server on :3000 earlier in the project. No code was changed. Status: **PASS**, **FAIL**, **BLOCKED** (could not be tested, reason given). Severity: Critical, High, Medium, Low. Roles were signed in by the owner (Admin, a customer account the owner created, Super Admin). Passwords and codes were never seen.

## Counts
| Result (one row per check; some rows bundle several small checks) | Count |
|---|---|
| PASS | 40 |
| FAIL (Medium) | 7 |
| FAIL (Low) | 14 |
| FAIL (High) | 2 |
| FAIL (Critical) | 0 |
| BLOCKED | 10 |

## Top 5 problems
1. **High, reminders never run.** The reminder worker (`lib/booking/reminders.js`) exists but nothing calls it: no endpoint, script or scheduler, so no reminder email is ever sent.
2. **High, walk-in "Something went wrong" not reproduced.** On the production build the walk-in saved first time and the log is empty; the original error is not captured (the dev terminal is not readable from here). Hardening for it sits on `feature/live-fixes` (not yet in `main`).
3. **Medium, booking failures are explained badly.** The booking cap (2 active), the booking rate limit (5 per hour per address) and other refusals all show "Your booking could not be completed. Please retry."
4. **Medium, console CSP errors on every page.** About 69 "Applying inline style violates CSP (`style-src-elem`)" errors per page load in production; the source is not traced and the noise hides real errors.
5. **Medium, test data is visible to real visitors.** The test barber "wfoijwfnwfe" is the only barber the public booking page offers; two gallery photos carry the upload form's hint sentence as their screen-reader description.

## 1. Public site (no sign-in)
| # | Item | Result | Sev | Notes |
|---|---|---|---|---|
| P1 | 10 public pages return 200 with title, description, one h1, alt text on every image | PASS | | |
| P2 | Layout at 1440, 768, 375 px: no horizontal scroll, no overflow, no broken images | PASS | | 768 checked on 4 pages, 375 on 10, 1440 on 10 |
| P3 | All internal links (about 20) return 200; home anchors `#team`, `#story` exist | PASS | | |
| P4 | Services filter tabs (All 6, Haircut 2, Beard 1, Shave 1, Color 1, Treatment 1) | PASS | | |
| P5 | Gallery dialog opens, Escape closes, focus moves inside | PASS | | Filter "Haircuts" only (one category in use) |
| P6 | Mobile menu opens, 8 links, 44 px or more, Escape closes | PASS | | |
| P7 | Booking as guest: preselect, free times load, Confirm sends to sign-in | PASS | | |
| P8 | Sign-in, contact validation (native field messages) | PASS | | |
| P9 | `/admin`, `/super-admin` return 404; `/design-system` 404 in production; unknown route 404 | PASS | | |
| P10 | `robots.txt` present with private paths disallowed | PASS | | Lists the private paths (Low) |
| P11 | Console errors: inline style blocked by CSP, about 69 per page | FIXED in Stage B | Medium | Repro: open any page in production, read console. Expected none. Likely a library injecting an un-nonced `<style>` (hashes of an empty style and another small sheet). Not traced |
| P12 | Gallery photos "Best Haircut" and "Smart haircut" have the upload form's hint sentence as their description | FAIL | Medium | Data created by the owner while testing; shows on the public gallery and to screen readers |
| P13 | Public booking offers only the test barber "wfoijwfnwfe" | FAIL | Medium | Test data; real barbers have no hours or the other test data |
| P14 | No "skip to content" link | FAIL | Low | |
| P15 | Unknown-route page is the plain Next default, not branded | FAIL | Low | |
| P16 | Booking page: 16 touch targets under 40 px at 375 px | FAIL | Low | |
| P17 | After guest sign-in the chosen service and time are lost (callback is only `/booking`) | FAIL | Low | |
| P18 | SMS reminder opt-in checkbox is shown but no SMS exists | FAIL | Low | Consent for a feature that is not built |
| P19 | Home, services, booking and auth pages lack canonical and social tags | FAIL | Low | |
| P20 | Sitemap is empty on localhost | PASS | | Expected: `SITE_URL` is localhost; needs the live domain |
| P21 | Mobile menu does not move focus into the panel on open; Escape on the account menu not confirmed | FAIL | Low | Synthetic key events only; recheck with a real keyboard |
| P22 | Contact form valid submit, forgot-password mail, reset link flow | BLOCKED | | Would send mail; the sender only delivers to the account owner |
| P23 | Keyboard walk-through, screen-reader pass, colour contrast | BLOCKED | | Needs a manual pass; only structural checks done (landmarks, names, language) |

## 2. Customer (USER account created by the owner)
| # | Item | Result | Sev | Notes |
|---|---|---|---|---|
| U1 | Sign-up (by the owner) and sign-in; `/sign-in` and `/sign-up` redirect when signed in | PASS | | |
| U2 | Account menu shows only Book, My Account, My Appointments, My Profile, Sign out | PASS | | |
| U3 | Blocked from `/admin`, `/admin/*`, `/super-admin`: real 404; admin APIs 405 | PASS | | |
| U4 | Booking end to end (two bookings) | PASS | | |
| U5 | 24-hour rule: booking inside 24 h shows no Reschedule or Cancel | PASS | | |
| U6 | Reschedule (Nov 9 to Nov 10, EDT to EST label correct) | PASS | | |
| U7 | Cancel more than 24 h ahead | PASS | | |
| U8 | Profile name validation (empty, markup) | PASS | | |
| U9 | Avatar upload shows, remove works | PASS | | Storage cleaned (no leftover media) |
| U10 | Sessions list shows "this device" | PASS | | |
| U11 | Cancel a missing or malformed booking id: 404 | PASS | | |
| U12 | Booking cap (2) and booking rate limit give the generic "could not be completed, retry" | FIXED in Stage B | Medium | Repro: book 3 times quickly. Expected a clear reason (cap, or wait N minutes). Cause: `BookingForm.jsx` maps every non-409-price error to one message |
| U13 | Change password | BLOCKED | | The assistant does not type passwords |
| U14 | After booking there is no confirmation page, only a one-line message on the form | FAIL | Low | Stage E |
| U15 | Reschedule panel opens on today's date and offers barbers with no hours | FAIL | Low | |
| U16 | A 20-minute service shows "30 min" | FAIL | Low | Probably the 15-minute grid rounding; label is misleading |
| U17 | Header avatar shows no photo while the profile page does | FAIL | Low | |
| U18 | "A confirmation email is on its way" is shown even when mail cannot be sent | FAIL | Low | The failure is audited but not shown |
| U19 | Direct API cancel inside 24 h | BLOCKED | | Booking id not visible to the tester; covered by unit tests |

## 3. Admin
| # | Item | Result | Sev | Notes |
|---|---|---|---|---|
| A1 | All admin pages 200; `/super-admin` 404; sidebar has 10 entries | PASS | | |
| A2 | Walk-in booking saves; appears in Today's list as WALK-IN | PASS | | |
| A3 | Walk-in "Something went wrong" (reported) | HARDENED in Stage B, cause still not captured | High | Not reproduced on the production build; server log empty; original error not captured. Hardening exists on `feature/live-fixes` |
| A4 | All bookings: search, status filter, unsafe input escaped, odd query values safe | PASS | | |
| A5 | All bookings pagination | BLOCKED | | Fewer rows than one page |
| A6 | Cancel a booking: asks Yes/No, No keeps it, Yes cancels | PASS | | |
| A7 | Confirm (pending), Complete, No-show | BLOCKED | | Online bookings are confirmed on creation, and Complete or No-show need a start time in the past (all slots are later today) |
| A8 | Customers list | PASS | | No customers exist (the customer account is in `user`; list showed none before sign-up) |
| A9 | Messages: read, replied, archive, delete | BLOCKED | | No message exists; the contact message the owner was asked to send was not received (0 in database) |
| A10 | Gallery: upload, hide, show (public follows), edit, delete | PASS | | |
| A11 | Services: create with picture, edit, replace picture, remove picture, archive | PASS | | |
| A12 | Packages: create, archive | PASS | | |
| A13 | Barbers: create, archive (D2a restore and refusal verified earlier) | PASS | | |
| A14 | Settings: invalid hours, phone, email, social link, date list all refused; valid closed date saved and restored | PASS | | |
| A15 | Reports: numbers match bookings; cancellation rate correct | PASS | | |
| A16 | Overview is a placeholder ("Nothing to show yet") | FAIL | Medium | |
| A17 | Cancel asks "Cancel and email the customer?" for a walk-in that has no email | FAIL | Low | Wording only; no mail is sent |
| A18 | After saving a picture the "Not saved yet" notice stays visible next to "Saved" | FAIL | Low | |
| A19 | A switched-off permission hides the button and the server rejects a direct request | PASS | | Not repeated in this audit; verified live on 2026-10-30 and 2026-10-31 (docs/TESTING.md) |
| A20 | Admin cancel of a customer booking: audited, mail failure audited | PASS | | |

## 4. Super Admin
| # | Item | Result | Sev | Notes |
|---|---|---|---|---|
| S1 | All admin pages and `/super-admin`, `/super-admin/permissions` open; `/super-admin/admins` and `/audit` are 404 (not built) | PASS | | |
| S2 | Permission screen: switch off and on, saved with audit (changes 13, 14); 32 of 32 on at the end | PASS | | |
| S3 | Admin screen follows a switch | PASS | | Not repeated; verified earlier |
| S4 | Overview is a placeholder | FAIL | Medium | I-23 to I-27 not built |

## 5. Email (from the code and the audit log; nothing was sent to anyone else)
| # | Item | Result | Sev | Notes |
|---|---|---|---|---|
| E1 | Confirmation (on booking), cancellation (customer or shop), reschedule: sent in the background, failures audited | PASS | | In this audit all three failed to deliver to `example.com` and were audited as `delivery_failed`; the bookings were not affected |
| E2 | Contact notice to the shop and auto-reply; auth mails (verification, reset, failed-sign-in alert) | BLOCKED | | Not exercised: would mail real addresses |
| E3 | Booking reminders | FIXED in Stage B (job route added; scheduling is the owner's) | High | Worker exists; no endpoint, script or scheduler calls it |
| E4 | Missing: shop notice for new, cancelled or rescheduled bookings; completed and no-show mails; cancel reason; manage-booking link; calendar file; mail log, idempotency, retry; one plain template for every event | FAIL | Medium | Stage C |
| E5 | Mail to customers cannot be delivered until the sender domain is verified (SPF, DKIM, DMARC) | BLOCKED | | Owner task |

## Test records
See `docs/TEST_DATA_CLEANUP.md`. Created by the audit: a cancelled walk-in, three archived test records, two customer bookings and one cancelled by the Admin, the customer account the owner created. Through-the-app clean-up done: gallery photo deleted, service pictures and avatar removed, closed date restored, permission switches restored (32 on).

## Stage B status (2026-10-31, branch feature/qa-fixes)
| Item | Root cause (one line) | Change | Check |
|---|---|---|---|
| E3 reminders never run (High) | The worker had no caller | `/api/jobs/booking-reminders` (POST or GET, Bearer `REMINDER_JOB_SECRET`, 404 when unset, 401 when wrong, counts only), `npm run run:reminders`, `docs/REMINDERS.md` with two scheduling options | route.test.js; live: no header 401, wrong secret 401, right secret 200 `{ok, sent:0, failed:0}` on the production build |
| A3 walk-in panel (High) | A failed request was not caught, so the error boundary replaced the section; unexpected server errors had no log | Form catches failures, double-submit lock and server duplicate guard, safe log line, useful panel | Tests (actions, repository, panel); live on the production build. Original error not captured: keep open until it appears again |
| U12 booking refusals (Medium) | One generic message for every refusal | `lib/booking/error-messages.js` (cap, rate limit, phone, service, time) used by the booking form; new toast `bookingLimit` | error-messages.test.js; live: the rate-limit refusal now says "Too many booking attempts... wait a while" |
| P11 CSP console errors (Medium) | sonner inserts its own `<style>` from JavaScript without a nonce; the browser blocked its stylesheet on every page | `style-src-elem` allows exactly the two content hashes sonner inserts (no `unsafe-inline`); `src/proxy.test.js` recomputes both hashes from the installed sonner and fails when it is updated | Live: the sonner style now has a sheet, no new console errors, toast looks right |

### Medium items not fixed in this stage (with reason)
| Item | Why | Where it goes |
|---|---|---|
| A16, S4 Admin and Super Admin overview pages are placeholders | Real overview numbers belong to the booking and dashboard work | Stage E (booking widgets), I-23 to I-27 (Super Admin) |
| E4 missing booking emails, mail log, templates | Whole feature | Stage C |
| P12 gallery photos with the hint sentence as description; P13 the test barber is the only bookable barber | Owner's data, not code | Owner: edit the two photos in Admin > Gallery; give the real barbers working hours and archive or hide the test barber |

### Low items (listed for the owner, not fixed)
P14 no skip link; P15 plain 404 page; P16 small touch targets on the booking page; P17 guest booking choices lost after sign-in; P18 SMS opt-in without SMS; P19 missing canonical and social tags on some pages; P21 focus and Escape on the menus (recheck with a real keyboard); U14 no confirmation page; U15 reschedule panel defaults; U16 "30 min" for a 20-minute service; U17 header avatar; U18 confirmation-mail promise; A17 "email the customer" wording for walk-ins; A18 stale "Not saved yet" notice after saving a picture.
