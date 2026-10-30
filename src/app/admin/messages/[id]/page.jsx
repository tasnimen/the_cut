import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageActions } from "@/features/dashboard/messages/MessageActions";
import { PageHeader, Panel } from "@/features/dashboard/components/primitives";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { requirePrincipal } from "@/lib/auth/authorization";
import { hasPermission } from "@/lib/auth/policy";
import { requireDashboardAccess } from "@/lib/auth/dashboard-guard";
import { getMessage, MESSAGE_STATUS_LABELS, replyHref } from "@/lib/contact/admin-messages";
import { getMongo } from "@/lib/db/mongo";

export const metadata = { title: "Message | Admin | The Cut Barbershop", robots: { index: false, follow: false } };

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "America/New_York" });
const DELIVERY = { sent: "Sent", queued: "Waiting to send", failed: "Failed" };

export default async function AdminMessagePage({ params }) {
  const user = await requireDashboardAccess("admin", { capability: "messages.view" });
  const can = await effectiveCapabilities(user.role);
  await requirePrincipal("contactManageAll");
  const { id } = await params;
  const { db } = await getMongo();
  const message = await getMessage(db, id);
  if (!message) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title={`Message from ${message.name}`}
        description={`Received ${WHEN.format(new Date(message.createdAt))} (Eastern).`}
        actions={<Link className="button button-small button-outline" href="/admin/messages"><span>All messages</span></Link>}
      />
      <Panel title="Message">
        <p><span className={`dash-badge${message.status === "new" ? "" : " is-off"}`}>{MESSAGE_STATUS_LABELS[message.status] ?? message.status}</span></p>
        <p className="dash-message-body">{message.message}</p>
        <p className="dash-muted">From {message.name} ({message.email}). Copy to the shop: {DELIVERY[message.notificationStatus] ?? message.notificationStatus}. Automatic reply to the customer: {DELIVERY[message.autoReplyStatus] ?? message.autoReplyStatus}.</p>
        <div className="dash-form-actions">
          <a className="button button-small" href={replyHref(message.email)}><span>Reply by email</span></a>
        </div>
      </Panel>
      <Panel title="Mark this message">
        <MessageActions id={message.id} status={message.status} canDelete={hasPermission(user.role, "contactDeleteAll") && can["messages.delete"]} canMark={can["messages.markStatus"]} />
      </Panel>
    </>
  );
}
