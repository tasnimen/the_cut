import { notFound } from "next/navigation";
import { BOOKING_EVENTS, buildBookingEmail, shopDetails } from "@/lib/mail/templates/booking";
import { bodyFragment } from "@/lib/mail/templates/layout";
import { site } from "@/config/site";

// Development only: shows every booking email with made-up data so the look can be checked without sending anything.
// In any other environment the page does not exist (404), like /design-system. Nothing here reads or writes the database.
export const metadata = { title: "Email preview | The Cut Barbershop", robots: { index: false, follow: false } };

const START = "2026-11-09T15:00:00.000Z";
const FAKE_BOOKING = Object.freeze({
  id: "000000000000000000000001", customerName: "Test Customer", phone: "+12125550100", status: "confirmed",
  services: [{ name: "Haircut" }, { name: "Beard Trim" }], barber: { id: "b1", name: "Daniel Carter" },
  startsAt: START, endsAt: "2026-11-09T15:50:00.000Z", durationMinutes: 50, totalPriceMinorUnits: 11500, currency: "USD", updatedAt: "2026-10-31T12:00:00.000Z",
});
const FAKE_SHOP = shopDetails({ ...site, contact: { phone: "+1 212 555 0100", email: "hello@example.test" }, location: { streetAddress: "1 Main Street", city: "New York", region: "NY", postalCode: "10001" } });

export default function EmailPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const mails = Object.keys(BOOKING_EVENTS).map((event) => ({
    event,
    mail: buildBookingEmail({ event, booking: FAKE_BOOKING, shop: FAKE_SHOP, baseUrl: "http://localhost:3000", previousStartsAt: "2026-11-02T15:00:00.000Z", reason: "The barber is unwell", now: new Date("2026-10-31T12:00:00Z") }),
  }));

  return (
    <main className="page-shell" style={{ padding: "32px 0", maxWidth: 760, margin: "0 auto" }}>
      <h1>Email preview</h1>
      <p>Every booking email with made-up data. Nothing is sent. Development only.</p>
      {mails.map(({ event, mail }) => (
        <section key={event} aria-labelledby={`email-${event}`} style={{ margin: "40px 0" }}>
          <h2 id={`email-${event}`}>{event} <small>({mail.audience})</small></h2>
          <p><strong>Subject:</strong> {mail.subject}</p>
          <p><strong>Calendar file:</strong> {mail.attachment ? `${mail.attachment.filename} (${mail.attachment.contentType})` : "none"}</p>
          <div dangerouslySetInnerHTML={{ __html: bodyFragment(mail.html) }} />
          <details><summary>Plain-text version</summary><pre style={{ whiteSpace: "pre-wrap" }}>{mail.text}</pre></details>
          {mail.attachment ? <details><summary>Calendar file contents</summary><pre style={{ whiteSpace: "pre-wrap" }}>{mail.attachment.content}</pre></details> : null}
        </section>
      ))}
    </main>
  );
}
