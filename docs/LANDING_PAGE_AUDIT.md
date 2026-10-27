# Landing page audit

**Status: implementation and production build complete; current browser review blocked.** References inspected: the supplied eight-page public-site montage and dashboard comparison. Earlier desktop/mobile captures found a mobile heading/header overflow; CSS was adjusted. This refinement adds new image cards, animated CTAs, and autoplay, but a current Edge capture request was rejected by automatic approval review. These latest visual and interaction changes are not browser-verified. The public montage's home composition is header → image-led hero → services → barber team → client reviews → footer.

## Findings, ordered by priority

| Priority | Area | Current implementation / mismatch | Improvement |
|---|---|---|---|
| P1 | Hero/banner | Resolved: full-cover `banner1.png` with left readability overlay and reference-aligned copy; its photo focal point remains visible. | Recheck crop at additional narrow/tablet widths. |
| P1 | Navbar | Transparent absolute header overlays the hero; full-width bottom divider removed. Desktop and mobile links share destinations; mobile disclosure supports toggle, Escape, outside click, link close, and resize close. | Lint/build pass; live browser verification at target widths was rejected by automatic approval review and remains outstanding. |
| P1 | Reviews | Implemented responsive native-scroll carousel with 4.6-second autoplay, previous/next and position controls, keyboard/touch input, and hover/focus/pointer pauses. Reduced motion disables autoplay; zero/one item states are guarded. | Browser interaction and timing have not been visually/behaviorally verified. |
| P1 | Responsive / inspection | Earlier mobile capture exposed heading/header overflow; responsive CSS was adjusted. The current Edge capture request was rejected by automatic approval review, so this task’s final render and carousel behavior are unverified. | Review the current production page at desktop/tablet/mobile and inspect the app console. |
| P2 | Images | Only two salon-interior banners and one watermarked square scissors graphic are available. No barber portraits, service photos, or usable customer portraits. | Use the requested shared card graphic for small cards with honest disclosure, and retain the photo limitation until approved assets are available. |
| P2 | Section structure | Resolved: `page.js` is a short composition; landing sections and data are under `src/features/landing/`. The extra closing CTA is absent. | Keep future sections in feature modules. |
| P2 | Symbols/icons | Resolved: reusable local inline SVG icons replace inconsistent text glyphs; no added icon dependency. | Reuse the shared icon component for future controls. |
| P2 | Navigation | Main links are local anchors except `/booking`, now a preview-only route without booking persistence. No Gallery/Shop links appear in this homepage header. | Keep real section anchors and preserve `/booking`; do not claim an appointment is saved until the API exists. |
| P3 | Typography | Georgia/Arial provide a serviceable fallback but do not fully reproduce the reference's refined serif/sans pairing. No approved font files are present. | Keep the hierarchy and document font choice as provisional; add licensed local fonts when supplied. |
| P3 | Card/button consistency | Border, gold fill/outline and hover/focus variants follow the documented palette. Service and barber surfaces lack appropriate photographs; team CTA targets the team profiles. | Supply approved photos and retain keyboard focus/target sizing. |
| P3 | Footer | Footer has the right dark grouped layout; hours/policies are explicitly placeholders and no verified contact channels exist. | Keep disclosed placeholders; do not add fictional phone/email/hours or dead social controls. |

## Asset use

See [ASSET_INVENTORY.md](ASSET_INVENTORY.md). `banner1.png` is used for the full-width hero; `banner2.png` for the barber/team introduction. The user-requested `card-image.webp` is reused in service, barber, and sample review cards using a shared source and `next/image` crop behavior. Its Dreamstime watermark and repeated use are disclosed. No `public/image/` folder exists.

## Accessibility / behavior checks

- Preserve semantic header/nav/main/section/footer and one page `h1`.
- Give carousel controls accessible names and boundary-disabled states; keyboard arrows work while the track is focused. Native horizontal scrolling provides touch swipe. Autoplay is 4.6 seconds, paused on hover/focus/pointer, disabled for reduced motion, and cleared when the component pauses/unmounts.
- Reveal animations must leave content visible without JavaScript and respect reduced motion.
- `next/image` banners use `fill` only inside a positioned, sized container, with accurate `sizes` and focal-point styles. Hero is the only preloaded image.
- `npm.cmd run lint` and `npm.cmd run build` pass after the current component/CSS changes. Production build prerenders `/` and `/_not-found`; HTTP checks returned 200 for `/` and the optimized card image.
- Current desktop/mobile captures, carousel interactions, scroll animations, reduced-motion behavior, and browser console remain unverified because automatic approval review rejected the requested Edge capture.

## Gravity UI note

The project has no Gravity UI packages. The official [`@gravity-ui/icons` README](https://github.com/gravity-ui/icons#readme) describes its glyphs as data rendered via `@gravity-ui/uikit`'s `Icon` component. Adding UIKit and its styling/theme solely for a few arrows/service glyphs would be a disproportionate UI dependency; this task uses a small local inline SVG icon component, which the request explicitly permits when simplest and compatible. No `lucide-react` dependency is introduced.
