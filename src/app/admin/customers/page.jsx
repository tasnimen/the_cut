import Link from "next/link";
import { DataTable, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { requirePrincipal } from "@/lib/auth/authorization";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { listCustomers } from "@/lib/customers/admin-customers";
import { customersQueryString, parseCustomerFilters } from "@/lib/customers/customers";
import { getMongo } from "@/lib/db/mongo";

export const metadata = { title: "Customers | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" });

export default async function AdminCustomersPage({ searchParams }) {
  await requireDashboardAccess("admin", { capability: "customers.view" });
  await requirePrincipal("customersRead");
  const filters = parseCustomerFilters(await searchParams);
  const { db } = await getMongo();
  const result = await listCustomers(db, filters);
  const filtered = Boolean(filters.q || filters.flag);
  const needReview = result.customers.filter((customer) => customer.needsReview).length;

  const rows = result.customers.map((customer) => ({
    id: customer.id,
    cells: {
      name: <><strong>{customer.name}</strong>{customer.suspended ? <> <span className="dash-badge is-off">Suspended</span></> : null}{customer.deletionRequestedAt ? <> <span className="dash-badge is-off">Deletion requested {DATE.format(new Date(customer.deletionRequestedAt))}</span></> : null}<br /><small className="dash-muted">{customer.email}</small></>,
      joined: customer.joinedAt ? DATE.format(new Date(customer.joinedAt)) : "-",
      bookings: `${customer.bookings} (${customer.completed} completed)`,
      last: customer.lastVisit ? DATE.format(new Date(customer.lastVisit)) : "No visits yet",
      noShows: customer.needsReview ? <span className="dash-badge is-off">{customer.noShows} no-shows: review</span> : String(customer.noShows),
    },
  }));

  const from = (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.total, result.page * result.pageSize);

  return (
    <>
      <PageHeader eyebrow="People" title="Customers" description="Customers who have an account. You see names, emails and booking counts only, and nothing here can be edited." />
      <div className="dash-stat-grid">
        <StatCard label={filtered ? "Matching customers" : "Customers"} value={result.total} icon="users" />
        <StatCard label="Flagged for review on this page" value={needReview} icon="shield" hint="Repeated no-shows" />
      </div>
      <Panel title="Search">
        <form className="dash-form dash-filter-form" method="get">
          <div className="dash-form-row">
            <div className="dash-field">
              <label htmlFor="c-q">Name or email</label>
              <input id="c-q" name="q" type="search" maxLength={60} defaultValue={filters.q} />
            </div>
            <div className="dash-field">
              <label htmlFor="c-flag">Show</label>
              <select id="c-flag" name="flag" defaultValue={filters.flag}>
                <option value="">All customers</option>
                <option value="review">Flagged for review</option>
              </select>
            </div>
          </div>
          <div className="dash-form-actions">
            <button className="button button-small" type="submit"><span>Apply</span></button>
            {filtered ? <Link className="dash-link-button" href="/admin/customers">Clear</Link> : null}
          </div>
        </form>
      </Panel>
      <Panel title={result.total === 0 ? "Results" : `Results (${from} to ${to} of ${result.total})`}>
        <DataTable
          caption="Customers"
          columns={[
            { key: "name", label: "Customer" },
            { key: "joined", label: "Joined" },
            { key: "bookings", label: "Bookings" },
            { key: "last", label: "Last visit" },
            { key: "noShows", label: "No-shows" },
          ]}
          rows={rows}
          emptyTitle={filtered ? "No customers match" : "No customers yet"}
          emptyText={filtered ? "Try a different search or clear the filters." : "Customers appear here when they create an account."}
        />
        {result.pages > 1 ? (
          <nav className="dash-pager" aria-label="Pages">
            {result.page > 1 ? <Link className="button button-small button-outline" href={`/admin/customers${customersQueryString(filters, { page: result.page - 1 })}`} rel="prev"><span>Previous</span></Link> : <span />}
            <span className="dash-muted">Page {result.page} of {result.pages}</span>
            {result.page < result.pages ? <Link className="button button-small button-outline" href={`/admin/customers${customersQueryString(filters, { page: result.page + 1 })}`} rel="next"><span>Next</span></Link> : <span />}
          </nav>
        ) : null}
      </Panel>
    </>
  );
}
