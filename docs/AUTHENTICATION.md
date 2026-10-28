# Authentication

**Status: Better Auth foundation implemented in Phase D; not production-ready.** Better Auth is the only approved authentication system for this project. Sign-in/sign-up UI and server-only SMTP flows are implemented; local auth email flows and production database behavior remain unverified. The local database-backed auth handler smoke check returned HTTP 200.

## Planned integration

- Next.js is the selected server boundary, consistent with [the application architecture](ARCHITECTURE.md). Integrate Better Auth using its supported Next.js server/client approach when authentication is in scope; do not add a separate Express server or custom competing session system.
- Use Better Auth's officially documented MongoDB adapter/configuration. Current code uses the supported Next.js catch-all Route Handler and MongoDB adapter.
- Configure base URL, trusted origins, cookie policy, and server/client integration for the actual local and production topology.
- Application roles are `USER`, `ADMIN`, and `SUPER_ADMIN`, with unauthenticated `GUEST`; enforce resource permissions inside each server entry point. Better Auth authenticates identity/session; it does not replace application authorization.
- Signup cannot set role/status/sessionVersion; all new accounts default to USER. No public role mutation or Super Admin bootstrap exists. Design an audited, one-time bootstrap before production.
- Email/password auth requires email verification; delivery is deferred until the Phase F mail layer exists. Admin and Super Admin protected operations require verified, active accounts and TOTP enrollment through the server guard.
- Auth uses Better Auth's database-backed session and disables its cookie cache so session reads are authoritative. For this same-origin Next.js application, this is the selected session design; the separate JWT/refresh family in the master prompt is superseded. A JWT plugin token may be added later for an external resource server, but it is not a replacement session.
- Better Auth's Mongo-backed rate limiter is enabled on auth routes. Sign-in/signup/reset/verification endpoints use explicit per-IP path limits; production IP accuracy depends on configuring the hosting proxy chain.
- The contact form is guest-accessible through `contactCreate`; media upload/delete is enforced by category-specific `media*ManageAll` permissions or `mediaAvatarOwn`. A USER may only set/delete the avatar record whose owner is their own Better Auth user id.
- The active policy is in `src/lib/auth/request-security.js`: sign-up allows 5 requests per IP per 3,600 seconds (one hour); sign-in allows 5 per IP per 60 seconds. Better Auth stores counters in MongoDB's `rateLimit` collection as `key`, `count`, and `lastRequest`; expired rows are pruned during later rate-limit requests, with no Mongo TTL index. The development reset utility at `scripts/reset-dev-auth-rate-limits.mjs` requires explicit confirmation, `NODE_ENV=development`, and a loopback MongoDB host. It is not suitable for Atlas; clear only the intended Atlas database's `rateLimit` collection manually. Stop the dev server first because new requests can recreate counters.
- Each session is stamped with the user's `sessionVersion`; the server guard compares it with the current database user version. Better Auth's user-update hook increments it when `role`, `status`, or `twoFactorEnabled` changes. Unit tests cover the bump behavior, but Atlas-backed invalidation testing remains outstanding; direct database writes must preserve the same version-bump rule.
- Privileged session creation, permission denials, failed sign-in/TOTP attempts, and bursts of five failures per observed IP in ten minutes are append-audited. Burst events are in-app audit signals; external notifications and privilege-change event producers remain outstanding.
- Successful TOTP verification issues a ten-minute session-bound HttpOnly proof cookie. Sensitive server operations must call `requireRecentStepUp(principal)` after authorization; no such operation exists yet. The proof is rejected after expiry or session change.

## Current actual behavior

| Item | Current state |
|---|---|
| Authentication endpoint | `src/app/api/auth/[...all]/route.js` |
| Session/cookie behavior | Better Auth DB session, cache disabled; production `__Host-better-auth.session_token`, Secure/HttpOnly/SameSite=Lax/Path=/, no Domain; unit-tested, live response awaits Atlas |
| Account fields | `role` default USER, `status` default ACTIVE, `sessionVersion` default 0; client signup cannot write these fields |
| TOTP | Better Auth two-factor plugin configured with account lockout; protected ADMIN/SUPER_ADMIN calls require enrollment; successful verification can issue a ten-minute session-bound step-up proof; changing enrollment bumps `sessionVersion` |
| Environment variable names | `MONGODB_URI`, optional `MONGODB_DB_NAME`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, optional `SITE_URL` |
| Verification | Permission/cookie/session-version policy tests pass; local `GET /api/auth/get-session` returned HTTP 200; signup/sign-in and email lifecycle remain unverified |

Before production, verify deployment origins/trusted proxies and a live `Set-Cookie` response, configure email delivery and backup/restore, test Mongo-backed limits and user-update version invalidation, add external failed-auth alerts and privilege-change audit producers, integrate step-up into sensitive mutations, and ensure all privileged mutations use the version-bumping path. Do not expose auth/database modules to Client Components.
