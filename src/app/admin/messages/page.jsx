import Link from "next/link";
import { DataTable, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { requirePrincipal } from "@/lib/auth/authorization";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { excerpt, listMessages, MESSAGE_STATUS_LABELS, messagesQueryString, parseMessageFilters } from "@/lib/contact/admin-messages";
import { getMongo } from "@/lib/db/mongo";

export const metadata = { title: "Messages | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });

export default async function AdminMessagesPage({ searchParams }) {
  await requireDashboardAccess("admin", { capability: "messages.view" });
  await requirePrincipal("contactManageAll");
  const filters = parseMessageFilters(await searchParams);
  const { db } = await getMongo();
  const result = await listMessages(db, filters);
  const filtered = Boolean(filters.q || filters.status);

  const rows = result.messages.map((message) => ({
    id: message.id,
    cells: {
      from: <><strong>{message.name}</strong><br /><small className="dash-muted">{message.email}</small></>,
      received: WHEN.format(new Date(message.createdAt)),
      message: <Link className="dash-link-button" href={`/admin/messages/${message.id}`}>{excerpt(message.message, 100)}</Link>,
      status: <span className={`dash-badge${message.status === "new" ? "" : " is-off"}`}>{MESSAGE_STATUS_LABELS[message.status] ?? message.status}</span>,
    },
  }));

  const from = (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.total, result.page * result.pageSize);

  return (
    <>
      <PageHeader eyebrow="Inbox" title="Messages" description="Messages sent from the contact page (also emailed to the shop). Open one to read it, reply by email and mark it as replied." />
      <div className="dash-stat-grid">
        <StatCard label="New messages" value={result.unread} icon="inbox" hint={result.unread > 0 ? "Not opened or marked yet" : "Nothing waiting"} />
        <StatCard label={filtered ? "Matching messages" : "All messages"} value={result.total} icon="chart" />
      </div>
      <Panel title="Search">
        <form className="dash-form dash-filter-form" method="get">
          <div className="dash-form-row">
            <div className="dash-field">
              <label htmlFor="m-q">Name, email or text</label>
              <input id="m-q" name="q" type="search" maxLength={60} defaultValue={filters.q} />
            </div>
            <div className="dash-field">
              <label htmlFor="m-status">Status</label>
              <select id="m-status" name="status" defaultValue={filters.status}>
                <option value="">Any status</option>
                {Object.entries(MESSAGE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="dash-form-actions">
            <button className="button button-small" type="submit"><span>Apply</span></button>
            {filtered ? <Link className="dash-link-button" href="/admin/messages">Clear</Link> : null}
          </div>
        </form>
      </Panel>
      <Panel title={result.total === 0 ? "Results" : `Results (${from} to ${to} of ${result.total})`}>
        <DataTable
          caption="Contact messages"
          columns={[
            { key: "from", label: "From" },
            { key: "received", label: "Received" },
            { key: "message", label: "Message" },
            { key: "status", label: "Status" },
          ]}
          rows={rows}
          emptyTitle={filtered ? "No messages match" : "No messages yet"}
          emptyText={filtered ? "Try a different search or clear the filters." : "Messages from the contact page appear here."}
        />
        {result.pages > 1 ? (
          <nav className="dash-pager" aria-label="Pages">
            {result.page > 1 ? <Link className="button button-small button-outline" href={`/admin/messages${messagesQueryString(filters, { page: result.page - 1 })}`} rel="prev"><span>Previous</span></Link> : <span />}
            <span className="dash-muted">Page {result.page} of {result.pages}</span>
            {result.page < result.pages ? <Link className="button button-small button-outline" href={`/admin/messages${messagesQueryString(filters, { page: result.page + 1 })}`} rel="next"><span>Next</span></Link> : <span />}
          </nav>
        ) : null}
      </Panel>
    </>
  );
}
