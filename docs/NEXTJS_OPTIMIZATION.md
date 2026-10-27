# Next.js optimization plan

**Status: plan retained; Home and Services routes implemented.** Installed Next.js 16 guides for project structure, Server/Client Components, images, fonts and CSS were read before the route work. No performance measurements are claimed.

| Area | Planned decision | Verification status |
|---|---|---|
| Components | Server Components by default; small client boundaries for actual interaction | Homepage follows this boundary; carousel and reveal are client components |
| Rendering/cache | Public catalog can be static/revalidated after freshness rules; all personalized dashboard/booking data is private and must not be shared cached | Route strategy TBD; not implemented |
| Data fetching | API calls from server for server-rendered page data; avoid a redundant internal Route Handler hop; parallelize independent work where helpful | Not implemented |
| Images | `next/image` for local/remote content; explicit geometry or `fill` container plus `sizes`; alt text; prioritize only measured hero/LCP image; lazy-load offscreen cards | Local home images use `next/image`; hero is preloaded; card art uses responsive fill containers |
| ImgBB | Inspect actual returned hostnames/paths before narrow `remotePatterns`; verify Next optimizer behavior and production host limits. ImgBB stores/serves the asset; Next image optimizer transforms it. Fallback TBD | URLs/provider not configured or tested |
| Fonts | Use `next/font`; choose serif display + sans body after asset/license review; load only needed subsets/weights | Homepage uses provisional system serif/sans stacks; no approved local font supplied |
| CSS/UI | Central design tokens; shadcn as primary component source if needed; avoid duplicative HeroUI styles | No components added |
| Bundles | Use route splitting; defer charting or other heavy interactive packages until their page requires them; inspect bundle before adding analyzer | No measurements |
| Metadata | Route-specific metadata, public Open Graph, sitemap/robots; private dashboards must not disclose content in metadata | Not implemented |
| Verification | Production build, mobile/desktop visual review, image request/layout stability, bundle review and Lighthouse/Core Web Vitals where feasible | Lint/build pass; desktop and initial mobile captures reviewed; final mobile recapture, tablet, bundle and Lighthouse checks outstanding |

## Homepage slice implementation

- `src/app/page.js` and `src/app/services/page.js` are Server Components. Small client boundaries handle the shared mobile nav, Services category filters, review carousel, and scroll reveal.
- The hero uses `next/image` with `fill`, a full-cover sized section, responsive `sizes`, `preload`, and a left readability overlay because it is the above-the-fold image. It uses supplied `banner1.png`; `banner2.png` is a lazy-loaded team-introduction image with its own `sizes` value. Service, barber, and sample review cards share `card-image.webp` via `CardImage`; the visible watermark and repeated use are disclosed.
- No remote ImgBB images are loaded, so no remote host pattern was added. Do not broaden image host configuration preemptively.
- The starter's Google font imports were removed; the page uses system serif/sans stacks because the exact font is unknown and no licensed font files are in the repository. Select and self-host the approved families with `next/font/local` once available.
- Static page sections/data remain server-rendered. No animation or carousel dependency was added.
- `npm.cmd run lint` and `npm.cmd run build` pass; `/`, `/services`, and preview-only `/booking` are statically generated. HTTP checks returned 200 for all three. Recent Edge capture requests were rejected by automatic approval review, so browser visual/interaction checks and console inspection remain unverified. No bundle, Lighthouse, or transfer-size measurements are recorded. Optimization is not complete.

Existing `next.config.mjs` enables `cacheComponents`, `partialPrefetching`, `reactCompiler`, and custom Tailwind Turbopack CSS rule. These starter config choices are not yet justified by app behavior; verify against the installed guides and remove or retain individually during foundation work. Do not preload all images or apply memoization without evidence.
