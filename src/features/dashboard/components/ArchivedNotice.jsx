import Link from "next/link";

// Shown instead of an edit form for an archived record: archived records are read-only until restored.
export function ArchivedNotice({ label, listPath }) {
  return (
    <>
      <p className="dash-form-note" role="status">This {label} is archived, so it cannot be edited and is hidden from the site and from booking. Restore it from the Archived tab first.</p>
      <div className="dash-form-actions">
        <Link className="button button-outline button-small" href={`${listPath}?view=archived`}><span>Open archived {label}s</span></Link>
      </div>
    </>
  );
}
