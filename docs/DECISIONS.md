# Decisions and open questions

**Status: initial planning log.**

| Topic | Current direction | Decision status |
|---|---|---|
| Language | JavaScript/JSX only | User-mandated |
| Frontend | Existing Next App Router project | Accepted; preserve current repo layout |
| API | Separate Express REST API, `/api/v1` | User-mandated direction; package layout TBD |
| Database | MongoDB Atlas, server-only | User-mandated; driver/ODM and plan TBD |
| UI foundation | shadcn/ui primary; HeroUI only for a justified gap | Proposed; verify exact current compatibility before install |
| Design palette | Near-black blue teal, fine cyan border, cream text, warm gold CTA | Provisional visual read, exact color samples TBD |
| Public routes | Home, About, Services, Gallery, Pricing, Booking, Shop, Contact | Seen in montage labels/content; final URL slugs TBD |
| Authentication | Better Auth only; Express is designated server; Next.js will use the supported client | User-mandated; actual integration/version, MongoDB adapter setup, origins/cookies and migration check remain for auth phase; see [AUTHENTICATION.md](AUTHENTICATION.md) |
| Accounts | `super_admin`, `admin`, `customer` | User-mandated roles; authorization remains Express responsibility |
| Booking concurrency | API validates on write, concurrent conflict test required | Requirement fixed; implementation strategy TBD |
| Images | ImgBB host + Next image optimization where production supports it | User preference; hostname/pattern/terms/performance unverified |
| Online payments | No online gateway | User-mandated |
| Deployment/runtime | TBD | Needs deployment choice, supported Node runtime, API origin and ops plan |

Before adding a dependency, confirm it serves a current requirement and its peer versions work with the installed stack. Before implementing authentication, booking policies, customer programs, or deployment, resolve the corresponding unknowns in [requirements](REQUIREMENTS.md).
