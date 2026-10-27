# Security plan

**Status: planned; no API, authentication, storage, or security controls are implemented or audited.** This is an initial control list, not a certification.

- Express is the enforcement boundary for identity, role, ownership, validation, and business rules. UI hiding is not authorization.
- Use Better Auth as the sole authentication system, with one authoritative Express server and the Next.js supported client. Verify official Express handler order, MongoDB adapter, origins, cookie/session and cross-origin credential settings before integration. See [AUTHENTICATION.md](AUTHENTICATION.md). Use CSRF protection where cookie credentials are used, rate limits for login/reset/contact/booking, and do not create a parallel custom password/session system.
- Validate and normalize all request data at runtime; allowlist writable fields; bound payloads and pagination; safely handle errors without secrets or stack traces in public responses.
- Restrict CORS to deployed frontend origins; use HTTPS in production; add security headers; configure proxy trust deliberately; log security-relevant events without passwords, tokens, SMTP/API keys, or unnecessary PII.
- Keep MongoDB, SMTP, and ImgBB credentials server-side. Never place secrets in `NEXT_PUBLIC_*`, source, logs, or docs. Validate environment at API startup and fail safely.
- Protect sensitive operations with explicit role and resource ownership checks. Prevent public Super Admin creation; document and audit the initial bootstrap.
- Image upload: server-side authorization, file type/size constraints, provider response validation, safe replacement/deletion and orphan handling. ImgBB is for suitable public media only; no confidential documents or sensitive personal images. Terms, limits, deletion, and retention remain to be checked.
- Appointment creation/rescheduling rechecks availability during a concurrency-safe write. Protect against duplicate submissions and forged prices/durations.
- Define user data retention, deletion/export, review moderation, audit retention, incident response, dependency updates, and restore drills before launch.

Threats and concrete mitigations are tracked in [requirements](REQUIREMENTS.md) and [architecture decisions](DECISIONS.md). No penetration test or security review has been run.
