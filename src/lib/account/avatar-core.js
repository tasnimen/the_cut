// Avatar workflow with injected dependencies (pure, testable). The caller authorizes first; this
// only ever touches the principal's own avatar records (ownerId === principal.id).

export function createAvatarService({ media, listOwn, setImage, audit }) {
  return Object.freeze({
    // Uploads the new photo, points the user at it, then removes the older ones (best effort).
    async replace({ principal, file, alt }) {
      const created = await media.upload({ principal, target: "avatar", file, alt });
      try {
        await setImage(principal.id, created.displayUrl);
      } catch (error) {
        await removeRecords(principal, await listOwn(principal.id), created.id, media, true).catch(() => {});
        throw error;
      }
      await removeRecords(principal, await listOwn(principal.id), created.id, media, false);
      await audit(principal, "account.avatar.updated");
      return { url: created.displayUrl };
    },

    async remove({ principal }) {
      await setImage(principal.id, null);
      await removeRecords(principal, await listOwn(principal.id), null, media, false);
      await audit(principal, "account.avatar.removed");
    },
  });
}

// Deletes every avatar record of the principal except `keepId` (or only `keepId` when `onlyThis`).
async function removeRecords(principal, records, keepId, media, onlyThis) {
  for (const record of records) {
    const isKept = keepId !== null && String(record._id) === String(keepId);
    if (onlyThis ? !isKept : isKept) continue;
    if (record.ownerId !== principal.id || record.category !== "avatar") continue;
    await media.delete({ principal, record }).catch(() => {});
  }
}

export const AVATAR_ALT = (name) => `${String(name || "Customer").slice(0, 80)} profile photo`;
