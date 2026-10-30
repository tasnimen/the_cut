import Link from "next/link";

// Active / Archived switch for a catalog list. Plain links (`?view=archived`), so it needs no script.
export function ArchiveViewTabs({ basePath, archived }) {
  return (
    <nav className="dash-view-tabs" aria-label="Show active or archived records">
      <Link href={basePath} aria-current={archived ? undefined : "page"} className={archived ? "" : "is-current"}>Active</Link>
      <Link href={`${basePath}?view=archived`} aria-current={archived ? "page" : undefined} className={archived ? "is-current" : ""}>Archived</Link>
    </nav>
  );
}

export const isArchivedView = (searchParams) => searchParams?.view === "archived";
