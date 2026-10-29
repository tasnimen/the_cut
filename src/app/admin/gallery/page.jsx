import { EmptyState, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { GalleryItemCard } from "@/features/dashboard/gallery/GalleryItemCard";
import { GalleryUploadForm } from "@/features/dashboard/gallery/GalleryUploadForm";
import { requirePrincipal } from "@/lib/auth/authorization";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { listAdminGallery, MAX_GALLERY_ITEMS } from "@/lib/gallery/admin-gallery";

export const metadata = { title: "Gallery | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

export default async function AdminGalleryPage() {
  await requireDashboardAccess("admin");
  await requirePrincipal("mediaGalleryManageAll");
  const { db } = await getMongo();
  const items = await listAdminGallery(db);
  const shown = items.filter((item) => item.active).length;

  return (
    <>
      <PageHeader eyebrow="Website" title="Gallery" description="Photos shown on the public Gallery page, newest first. As soon as one photo is shown, the built-in concept images are no longer displayed." />
      <div className="dash-stat-grid">
        <StatCard label="Photos shown" value={shown} icon="image" hint={shown === 0 ? "The site shows its built-in images" : undefined} />
        <StatCard label="Hidden" value={items.length - shown} icon="shield" />
        <StatCard label="Room left" value={Math.max(0, MAX_GALLERY_ITEMS - items.length)} icon="chart" />
      </div>
      <Panel title="Add a photo"><GalleryUploadForm /></Panel>
      <Panel title="Your photos">
        {items.length === 0 ? (
          <EmptyState icon="image" title="No photos yet" text="Add your first photo above. Until then, visitors see the built-in gallery." />
        ) : (
          <ul className="dash-gallery-list">
            {items.map((item) => <GalleryItemCard key={item.id} item={item} />)}
          </ul>
        )}
      </Panel>
    </>
  );
}
