import "server-only";
import { unstable_cache } from "next/cache";
import { getMongo } from "@/lib/db/mongo";
import { CATALOG_REVALIDATE_SECONDS, CATALOG_TAGS } from "@/lib/catalog/tags";
import { normalizeSlotOverrides } from "@/lib/images/slot-input";
import { createCooldown } from "@/lib/utils/cooldown";

// Slot overrides from the database (cached, tagged `catalog:slots`). getImage() is synchronous, so a page
// calls `await primeSlotOverrides()` once at the top; the result is kept here for the components it renders.
// The data is the same for every visitor. If the database is unreachable the last good copy (or none, which
// means local files and fallbacks) is used.

const cooldown = createCooldown({ ms: 30_000 });
let current = {};

const loadDocuments = unstable_cache(
  async () => {
    const { db } = await getMongo();
    return db.collection("imageSlot").find({}, { projection: { _id: 0, slot: 1, secureUrl: 1, alt: 1, width: 1, height: 1 } }).limit(200).toArray();
  },
  ["catalog-slots-v1"],
  { tags: [CATALOG_TAGS.slots], revalidate: CATALOG_REVALIDATE_SECONDS },
);

export async function primeSlotOverrides() {
  try {
    current = normalizeSlotOverrides(await cooldown(loadDocuments));
  } catch {
    // keep the previous copy
  }
  return current;
}

export function currentSlotOverrides() {
  return current;
}
