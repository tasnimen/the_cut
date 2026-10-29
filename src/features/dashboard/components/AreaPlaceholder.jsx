import { SiteFrame } from "@/components/layout/SiteFrame";
import { ROLE_LABELS } from "@/config/navigation";

// Temporary body for a dashboard area until its shell and screens are built (units I-2 onward).
// Shows only the signed-in principal's own data; no figures are invented.
export function AreaPlaceholder({ principal, title, description }) {
  return (
    <SiteFrame headerVariant="flow">
      <section className="dashboard-placeholder page-shell" aria-labelledby="dashboard-placeholder-title">
        <div className="contact-card">
          <p className="eyebrow">{ROLE_LABELS[principal.role] ?? "Account"}</p>
          <h1 id="dashboard-placeholder-title">{title}</h1>
          <p className="contact-empty">{description}</p>
          <p className="contact-empty">Signed in as {principal.name || principal.email}.</p>
        </div>
      </section>
    </SiteFrame>
  );
}
