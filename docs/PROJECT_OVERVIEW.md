# Project overview

**Status: early frontend implementation.** Home, Services, and a preview-only Booking interface are implemented; booking backend, authentication, and remaining routes are not.

The Cut is one barbershop's public website and management application. Its intended surfaces are public marketing and service discovery, customer booking/account views, and staff tools. It is not multi tenant. The design references depict an eight-page public site, an admin dashboard, and a customer dashboard; they do not show a Super Admin interface.

The repository contains a Next.js App Router frontend in JavaScript with Next 16.4.3, React 19.3.0, and Tailwind CSS 4. Home (`/`), Services (`/services`), and a preference-only Booking interface (`/booking`) are implemented; there is no API, persistence, authentication, or business operation yet. The next task is manual visual verification of Booking, followed by resolving the backend/business-rule dependencies in [NEXT_TASK.md](../NEXT_TASK.md).

Product scope and unresolved choices: [requirements](REQUIREMENTS.md), [architecture](ARCHITECTURE.md), [roles](ROLE_PERMISSIONS.md), [progress](PROGRESS.md).
