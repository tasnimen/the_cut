import { SiteFrame } from "@/components/layout/SiteFrame";
import { getImage } from "@/lib/images/server";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";
import { galleryItems } from "@/features/marketing/data/gallery";
import { GalleryGrid } from "@/features/marketing/components/GalleryGrid";
import { MarketingPageHero } from "@/features/marketing/components/MarketingPageHero";

export const metadata = {
  title: `Gallery | ${site.name}`,
  description: "Browse concept imagery for The Cut's studio and barbering details. Verified shop and client photography is pending.",
  alternates: { canonical: ROUTES.gallery },
  openGraph: { title: `Gallery | ${site.name}`, description: "A visual preview of The Cut's studio concept.", type: "website" },
};

export default function GalleryPage() {
  const galleryImages = Object.fromEntries(galleryItems.map((item) => [item.id, getImage(`gallery-${item.id}`).src]));
  return (
    <SiteFrame activePath={ROUTES.gallery}>
      <MarketingPageHero
        description="A visual preview of the space and the details that inspire the experience."
        eyebrow="The gallery"
        image={getImage("hero-gallery")}
        title={<>Moments around<br /><em>the craft.</em></>}
      />
      <section className="gallery-section page-shell" aria-labelledby="gallery-title">
        <div className="marketing-section-heading">
          <p className="eyebrow">Studio & details</p>
          <h2 id="gallery-title">A closer <em>look.</em></h2>
          <p className="marketing-disclosure">These are concept images already used on the site, not verified examples of the shop, its staff, or client work.</p>
        </div>
        <GalleryGrid images={galleryImages} />
      </section>
    </SiteFrame>
  );
}
