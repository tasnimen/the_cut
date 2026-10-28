# Reference design audit

**Date:** 2026-10-29. **Method:** Built-in browser against `http://localhost:3000`. The pane renders at about 800x741 and stayed at its mobile/tablet nav breakpoint even after a 1440px emulation request, so only the top of each page was inspected, at that width. A full-page desktop comparison has **not** been done. No page is declared visually matching.

**References available this session:** image 1 (eight public pages: Home, About, Services, Gallery, Pricing, Booking, Shop, Contact) and image 2 (Admin and Customer dashboards). Neither is stored in the repo. Shop, Gallery detail, Team sections and both dashboards are not implemented, so they were not compared.

| Page/component | Reference mismatch | Required correction | Status |
|---|---|---|---|
| Home hero | Garbled characters ("ITÃ¢â‚¬â„¢S", "â€"") from mis-encoded source | Re-encode text as UTF-8 | Fixed; confirmed in browser |
| Home hero | Reference: uppercase gold sans "MORE THAN A / HAIRCUT" plus "IT'S A LIFESTYLE"; actual uses a serif lead plus an italic gold word | Restyle hero headline | Open |
| Home hero footer | Tag line reads "DHAKA · BANGLADESH" while the eyebrow and booking rules use New York | User must confirm the real location; not changed | Open (needs decision) |
| Header | CTA read "Book a chair"; reference says "Book Appointment" | Relabel | Fixed in source; not re-screenshotted |
| Header | Reference shows inline nav with Shop, search icon and a Login control | Auth control made session-aware (see below); Shop and search not built | Partly done |
| Services / Pricing | Reference pricing shows Basic $25 / Standard $40 / Premium $60 tiers; the approved catalog has six services | Needs a user decision on tier content; not changed | Open (needs decision) |
| Services / Pricing / About heroes | Reuse generic shop interiors; reference uses page-specific photography | Only `banner1/2` and `card-image` exist | Open (asset limit) |
| Booking | Reference is a three-column layout (service, barber, date/time) with a summary panel; actual is a stepper in one column at this width | Compare at true desktop width first | Open (not compared at desktop) |
| About, Gallery, Contact | Not compared beyond the About hero | Full comparison at desktop width | Not inspected |
| Admin / Customer dashboards | Not implemented | New feature phase, not started | Planned |
