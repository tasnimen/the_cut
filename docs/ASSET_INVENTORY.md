# Public image asset inventory

**Inspected:** 2026-10-27. Dimensions/formats read from file headers; visual subjects inspected directly.

| Path | Dimensions | Size | Visual subject | Homepage decision |
|---|---:|---:|---|---|
| `public/images/banner1.png` | 1983 × 793 PNG | 1,708,018 bytes | Wide, dark luxury shop; empty dark area at left, illuminated barber chair/mirror at right | Use as full-bleed homepage hero; left copy is legible without obscuring subject. Optimize through `next/image`; tune mobile `object-position`. |
| `public/images/banner2.png` | 2048 × 768 PNG | 2,083,185 bytes | Wide salon interior with reception, chairs, warm lamps | Use as the barber/team introduction photo panel; use cover crop and dark overlay. |
| `public/images/card-image.webp` | 800 × 800 WebP | 22,352 bytes | Gold scissors emblem on dark square, visible Dreamstime watermark | Used as the user-requested shared temporary image in service, barber, and sample review cards. Disclosure identifies it as one reused sample image; replace with approved content before presenting cards as specific services/people/customers. |

No separate `public/image/` directory or barber, service, gallery, or customer portrait photos were found. The earlier handoff mentioned a temporary SVG scene, but that file is absent from the current working tree. The square card image uses a cover crop without distortion; its visible watermark and repeated use are disclosed. Replace it with appropriate approved photography when available. The PNG originals are large; verify actual optimized requests in browser/deployment before claiming a transfer-size improvement.
