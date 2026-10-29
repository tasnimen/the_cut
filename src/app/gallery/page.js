import { SiteFrame } from "@/components/layout/SiteFrame";
import { primeSlotOverrides } from "@/lib/images/slot-overrides";
import { getImage } from "@/lib/images/server";
import { getPublicGallery } from "@/lib/catalog/source";
import { mergeGallery } from "@/lib/gallery/gallery-input";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";
import { galleryItems, visibleGalleryItems } from "@/features/marketing/data/gallery";
import { GalleryGrid } from "@/features/marketing/components/GalleryGrid";
import { MarketingPageHero } from "@/features/marketing/components/MarketingPageHero";

export const metadata = {
  title: `Gallery | ${site.name}`,
  description: "Browse concept imagery for The Cut's studio and barbering details. Verified shop and client photography is pending.",
  alternates: { canonical: ROUTES.gallery },
  openGraph: { title: `Gallery | ${site.name}`, description: "A visual preview of The Cut's studio concept.", type: "website" },
};

export default async function GalleryPage() {
  await primeSlotOverrides();
  const resolved = Object.fromEntries(galleryItems.map((item) => [item.id, getImage(`gallery-${item.id}`)]));
  const builtIn = visibleGalleryItems(galleryItems, (item) => resolved[item.id].source !== "fallback");
  const builtInImages = Object.fromEntries(builtIn.map((item) => [item.id, resolved[item.id].src]));
  // Photos uploaded by the shop come first; once there are any, the labelled concept images are dropped.
  const { items, images: galleryImages, showsSamples } = mergeGallery({ uploaded: await getPublicGallery(), builtIn, builtInImages });
  return (
    <SiteFrame activePath={ROUTES.gallery}>
      <MarketingPageHero
        description="Explore our gallery and see the transformation, style, and precision in every cut."
        eyebrow="Our gallery"
        image={getImage("hero-gallery")}
        title={<>Moments that define<br /><em>our craft.</em></>}
      />
      <section className="gallery-section page-shell" aria-labelledby="gallery-title">
        <div className="marketing-section-heading">
          <p className="eyebrow">Gallery</p>
          <h2 id="gallery-title">A closer <em>look.</em></h2>
          {showsSamples ? <p className="marketing-disclosure">Some images shown here are concept images, not verified examples of the shop, its staff, or client work.</p> : null}
        </div>
        <GalleryGrid items={items} images={galleryImages} />
      </section>
    </SiteFrame>
  );
}
