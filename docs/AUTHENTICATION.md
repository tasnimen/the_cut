# Authentication

**Status: mandatory direction selected; not implemented.** Better Auth is the only approved authentication system for this project. No Better Auth dependency, server instance, client, auth route, session storage, or user collection exists in the current source. The current homepage does not authenticate users.

## Planned integration

- Express is the sole authoritative Better Auth server, consistent with [the application architecture](ARCHITECTURE.md). The Next.js app will use the supported Better Auth client to call that server. Do not instantiate a second competing Better Auth server in Next.js.
- Use Better Auth's officially documented MongoDB adapter/configuration when the API and MongoDB foundation are implemented.
- Configure base URL, trusted origins, cookies, cross-origin credentials, and the Express handler/middleware order for the actual local and production topology. Verify whether body parsing must be mounted after the Better Auth handler in the current official Express guide.
- Application roles remain `super_admin`, `admin`, and `customer`; enforce resource permissions in Express. Better Auth authenticates identity/session; it does not replace application authorization.
- Disable public Super Admin registration and document an audited bootstrap path before production.

## Current actual behavior

| Item | Current state |
|---|---|
| Authentication endpoints | None |
| Session/cookie behavior | None |
| User migration | Not applicable; no existing user records or auth implementation found |
| Environment variable names | None required by current source |
| Verification | No authentication tests or integration checks run |

Before implementing authentication, read current official Better Auth documentation for Express integration, MongoDB adapter and client integration; verify release/peer compatibility and deployment origins; specify migration/backup and test plan. Do not install/configure Better Auth as part of an unrelated homepage task.
