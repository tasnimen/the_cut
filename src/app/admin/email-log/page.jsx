import Link from "next/link";
import { DataTable, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { ResendMailButton } from "@/features/dashboard/mail/ResendMailButton";
import { requirePrincipal } from "@/lib/auth/authorization";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMongo } from "@/lib/db/mongo";
import { listMailLog, MAIL_STATUS_LABELS, parseMailFilters } from "@/lib/mail/admin-mail-log";

export const metadata = { title: "Email log | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });

export default async function AdminEmailLogPage({ searchParams }) {
  const user = await requireDashboardAccess("admin", { capability: "emailLog.view" });
  await requirePrincipal("mailLogManageAll", { capability: "emailLog.view" });
  const can = await effectiveCapabilities(user.role);
  const filters = parseMailFilters(await searchParams);
  const { db } = await getMongo();
  const result = await listMailLog(db, filters);

  const rows = result.entries.map((entry) => ({
    id: entry.id,
    cells: {
      when: entry.createdAt ? WHEN.format(new Date(entry.createdAt)) : "",
      email: <><strong>{entry.label}</strong><br /><small className="dash-muted">{entry.role}: {entry.recipient}</small></>,
      status: <span className={`dash-badge${entry.status === "sent" ? "" : " is-off"}`}>{MAIL_STATUS_LABELS[entry.status] ?? entry.status}</span>,
      attempts: entry.attempts,
      detail: entry.errorCode ? <small className="dash-muted">Error code {entry.errorCode}{entry.nextAttemptAt ? `, next try ${WHEN.format(new Date(entry.nextAttemptAt))}` : ""}</small> : "",
      actions: entry.status === "failed" && can["emailLog.resend"] ? <ResendMailButton id={entry.id} label={entry.label} /> : <span className="dash-muted">{entry.status === "sent" ? "Delivered" : ""}</span>,
    },
  }));

  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const link = (page) => `/admin/email-log?${new URLSearchParams({ ...(filters.status ? { status: filters.status } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString()}`;

  return (
    <>
      <PageHeader eyebrow="Mail" title="Email log" description="Booking emails sent to customers and the shop. Only the event, a masked address, the status and an error code are kept, never the text of an email. A failed email is tried again automatically (after 5 minutes, 30 minutes and 2 hours); you can also send it again by hand. A delivered email is never sent twice." />
      <div className="dash-stat-grid">
        <StatCard label="Failed, not yet delivered" value={result.failed} icon="alert" hint={result.failed > 0 ? "Check the sender setup, then use Resend" : "Everything was delivered"} />
        <StatCard label={filters.status ? "Matching emails" : "All emails"} value={result.total} icon="inbox" />
      </div>
      <Panel title="Filter">
        <form className="dash-form dash-filter-form" method="get">
          <div className="dash-form-row">
            <div className="dash-field">
              <label htmlFor="ml-status">Status</label>
              <select id="ml-status" name="status" defaultValue={filters.status}>
                <option value="">Any status</option>
                {Object.entries(MAIL_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="dash-form-actions">
            <button className="button button-small" type="submit"><span>Apply</span></button>
            {filters.status ? <Link className="dash-link-button" href="/admin/email-log">Clear</Link> : null}
          </div>
        </form>
      </Panel>
      <Panel title="Emails">
        <DataTable
          caption="Booking emails"
          columns={[{ key: "when", label: "When (Eastern)" }, { key: "email", label: "Email" }, { key: "status", label: "Status" }, { key: "attempts", label: "Tries" }, { key: "detail", label: "Detail" }, { key: "actions", label: "Actions" }]}
          rows={rows}
          emptyTitle="No emails yet"
          emptyText="Booking emails appear here as soon as one is sent."
        />
        {pages > 1 ? (
          <nav className="dash-pager" aria-label="Pages">
            {filters.page > 1 ? <Link className="dash-link-button" href={link(filters.page - 1)}>Previous</Link> : null}
            <span className="dash-muted">Page {filters.page} of {pages}</span>
            {filters.page < pages ? <Link className="dash-link-button" href={link(filters.page + 1)}>Next</Link> : null}
          </nav>
        ) : null}
      </Panel>
    </>
  );
}
