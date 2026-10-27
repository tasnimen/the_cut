# Next task: Phase D security verification and closure

**Status:** Phase E public routes are implemented. The user has resumed Phase D. Phase D remains **PARTIAL / NOT DONE** until the security gate is satisfied.

## Current Phase D scope

- Finish local test/build and validate failed-auth audit and step-up hook behavior against the installed Better Auth version.
- Complete the applicable security tests without creating real accounts or exposing `.env` values.
- Do not claim Phase D complete while production origin/proxy/cookie, Atlas-backed invalidation, email lifecycle, external alerting, or sensitive-operation integration remains unverified.
- Keep auth/business operations inside Next.js Server Actions and Route Handlers; do not introduce Express.

## Remaining Phase D checks

- External alert delivery and audit producers for privileged role/status changes.
- Integration of `requireRecentStepUp` into privileged mutations when those operations are introduced.
- Atlas-backed session-version invalidation test, complete signup/sign-in/reset lifecycle, production `Set-Cookie`, trusted proxy/IP and CSP origin checks.
- Re-run applicable Section 11.1 tests and security gate. Phase D remains **NOT DONE** until blockers close.

## Constraints

- JavaScript/JSX only. Preserve phases A-C and the user's completed work.
- Do not invent business facts, SMTP addresses, product details, policies, staff identities, or rights to images.
- Never echo or commit `.env` values. Use required mail/upload secrets only on the server.
- Booking remains preview-only; shop commerce and dashboards are later phases.
