# Next task: correct Booking layout defects and resolve booking policy

**Status: browser visual review completed; three concrete layout defects remain.** Home (`/`), Services (`/services`), and the preview-only Booking page (`/booking`) exist. The booking form does not send or store data and never reports a successful reservation. See `docs/BOOKING_PAGE_AUDIT.md` for screenshot evidence, findings, and data limitations.

## Requirements

- Define final service names, prices, durations/buffers, verified barber roster, opening hours and timezone, availability rules, cancellation policy, and whether sign-in is required to book.
- Implement the Express/MongoDB booking API as the authority for validation, availability and concurrency; do not trust client-selected availability.
- Apply the planned Better Auth session and authorization requirements when applicable. Do not create a parallel custom authentication system or bypass ownership checks.
- Connect `/booking` only after the API and policy exist. Display confirmation only after a validated successful server response; retain truthful pending and error states.
- Read installed Next.js docs before any additional Next route changes. Keep the existing shared header/footer, design tokens, and responsive form controls.
- Update `docs/PROGRESS.md`, `docs/AI_HANDOFF.md`, this file, and `CHANGELOG.md`; run lint/build and route checks and record actual results.

## Browser review findings

- The Next development server was already running on port 3000; a second server could not start on port 3010 because of the existing-server lock. Review used `http://localhost:3000/booking`.
- Captures: `booking-1440.png`, `booking-768.png`, and `booking-375.png`.

- The intro overlaps the shared header at all checked widths; labels/calendar/helper text are around 8px and too small to read comfortably.
- At 768px, the selection panels follow the expected two-column/third-row layout, but details and summary remain side-by-side and the summary is cramped.
- At 375px, panels stack and no horizontal overflow was observed. Widths 390px and 320px remain unchecked.
- Interaction checks: selected service/date/time and name update the summary; past dates are disabled; malformed email is invalid; barber control offers only “No preference.” Valid sample submission states nothing was sent or saved and makes no booking request. Footer appointment link resolves to `/booking`; no console errors were reported.
- Do not claim visual conformance until defects are corrected and browser-checked again.

## Next implementation task

Correct intro/header spacing, restore readable text sizes, and stack the details and summary at tablet widths where each needs adequate room. Recheck 1440, 768, 390, and 320px. Then obtain verified booking policies before backend implementation; do not infer unknown business values.

## Booking backend milestone (blocked on verified policy inputs)

Define the unresolved booking rules and implement the authoritative Express/MongoDB API with concurrency-safe availability and mandated Better Auth authorization before enabling real appointment submission. Keep `docs/DESIGN_SYSTEM.md` and `docs/COMPONENT_GUIDE.md` aligned with implemented code.
