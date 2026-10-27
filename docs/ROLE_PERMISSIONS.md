# Roles and permissions

**Status: initial role model from the user's specification.** Exactly three application roles are intended: `super_admin`, `admin`, and `customer`. Public visitor is unauthenticated, not a fourth stored role. The references show Admin and Customer layouts; no Super Admin layout is supplied.

| Capability | Public | Customer | Admin | Super Admin |
|---|---:|---:|---:|---:|
| Read active public services, barbers, gallery, business contact | Yes | Yes | Yes | Yes |
| Manage own profile | No | Own only | No, unless explicit support workflow | No, unless explicit support workflow |
| Create own appointment / read own history | No | Own only | Business management | Business management |
| Cancel/reschedule appointment | No | Own, within policy | Business scope | Business scope |
| Manage customers, barbers, services, schedules, appointments | No | No | Yes | Yes |
| Manage public gallery, reviews, operational business settings | No | Submit review only under policy | Yes | Yes |
| View business reports | No | No | Permitted business reports | Yes |
| Assign admin roles / manage admin accounts | No | No | No | Yes |
| Set system configuration / maintenance mode | No | No | No | Yes |
| Read audit/security/system/backup/release status | No | No | No (except explicitly permitted operational summaries) | Yes |

All rows are server-enforced in Express middleware and service logic. Identify the actor from verified authentication, never a client supplied role/user ID. Enforce ownership on every object operation; prevent IDOR, mass assignment, privilege escalation and public Super Admin registration. Create a controlled bootstrap procedure, with no hidden backdoor. Sensitive role/system actions must be audited. Fine-grained permission names, admin scope, and developer maintenance access remain to be specified before auth implementation.
