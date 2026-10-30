import { IMAGE_SLOTS } from "@/config/images";

// Public team cards. The database is used only for barbers explicitly marked `publicProfile: true`
// (and active); with none, the generic file profiles stay. Only an allow-list of fields is copied:
// schedules, service assignments, ids and timestamps never reach the public pages.

import { publicImage } from "@/lib/catalog/image-input";

const cleanText = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export function barberPhotoSlot(slug) {
  const slot = `barber-${slug}`;
  return Object.hasOwn(IMAGE_SLOTS, slot) ? slot : null;
}

export function normalizePublicBarbers(documents, fileProfiles) {
  const fromFile = () => fileProfiles.map((profile) => Object.freeze({ ...profile }));
  if (!Array.isArray(documents)) return Object.freeze(fromFile());

  const visible = documents
    .filter((doc) => doc && doc.publicProfile === true && doc.active !== false && typeof doc.slug === "string" && cleanText(doc.name, 120))
    .map((doc, index) => ({
      order: Number.isFinite(doc.displayOrder) ? doc.displayOrder : 1000 + index,
      profile: {
        key: `barber-${doc.slug}`,
        slug: doc.slug,
        name: cleanText(doc.name, 120),
        role: cleanText(doc.role, 60) || "Barber",
        focus: cleanText(doc.focus, 120),
        photoSlot: barberPhotoSlot(doc.slug),
        image: publicImage(doc.image),
      },
    }))
    .sort((a, b) => a.order - b.order || a.profile.name.localeCompare(b.profile.name));

  if (visible.length === 0) return Object.freeze(fromFile());
  return Object.freeze(visible.map((item) => Object.freeze(item.profile)));
}
