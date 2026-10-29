import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOG_TAGS } from "@/lib/catalog/tags";

// Call from a Server Action or Route Handler AFTER a successful admin write. `{ expire: 0 }` makes the
// next public request read fresh data instead of serving stale content.
export function revalidateCatalog(kinds = ["services", "packages", "barbers", "settings"]) {
  for (const kind of kinds) {
    const tag = CATALOG_TAGS[kind];
    if (tag) revalidateTag(tag, { expire: 0 });
  }
}
