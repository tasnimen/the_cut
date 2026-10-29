import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Dashboard building blocks. None of them contains data: callers pass real values or render an
// EmptyState. A missing value is shown as an em dash, never as an invented number.

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="dash-page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="dash-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="dash-page-actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`dash-panel ${className}`.trim()}>
      {title || action ? (
        <div className="dash-panel-head">
          {title ? <h2>{title}</h2> : <span />}
          {action ? <Link className="dash-panel-link" href={action.href}>{action.label}</Link> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, icon = "chart" }) {
  const hasValue = value !== null && value !== undefined && value !== "";
  return (
    <div className="dash-stat">
      <span className="dash-stat-icon" aria-hidden="true"><Icon name={icon} size={18} /></span>
      <div>
        <p className="dash-stat-label">{label}</p>
        <p className="dash-stat-value">{hasValue ? value : "—"}</p>
        {hint ? <p className="dash-stat-hint">{hint}</p> : null}
      </div>
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, text, action }) {
  return (
    <div className="dash-empty">
      <span className="dash-empty-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {action ? <Link className="button button-small" href={action.href}><span>{action.label}</span></Link> : null}
    </div>
  );
}

// columns: [{ key, label }]; rows: [{ id, cells: { [key]: node } }]. Shows an EmptyState when there are no rows.
export function DataTable({ caption, columns, rows, emptyTitle = "Nothing here yet", emptyText }) {
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} text={emptyText} />;
  return (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>{columns.map((column) => <td key={column.key}>{row.cells[column.key] ?? "—"}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingBlock({ lines = 3, label = "Loading" }) {
  return (
    <div className="dash-loading" role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: lines }, (_, index) => <span className="dash-skeleton" key={index} style={{ width: `${92 - index * 14}%` }} />)}
    </div>
  );
}

export function DashboardLoading() {
  return (
    <div>
      <div className="dash-page-header"><span className="dash-skeleton dash-skeleton-title" /></div>
      <div className="dash-stat-grid">
        {[0, 1, 2, 3].map((index) => <div className="dash-stat" key={index}><LoadingBlock lines={2} /></div>)}
      </div>
      <Panel><LoadingBlock lines={4} /></Panel>
    </div>
  );
}
