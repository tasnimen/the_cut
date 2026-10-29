import { site } from "@/config/site";
import { greetingFor } from "@/config/dashboard-nav";
import { EmptyState, PageHeader, Panel } from "@/features/dashboard/components/primitives";

// Temporary body for a dashboard area until its screens are built (units I-8 onward).
// Shows only the signed-in principal's own data; no figures are invented.
export function AreaPlaceholder({ principal, title, description }) {
  const firstName = (principal.name || principal.email).split(/\s+/)[0];
  return (
    <>
      <PageHeader eyebrow={title} title={`${greetingFor(new Date(), site.timeZone)}, ${firstName}`} description="Here is what is happening at The Cut." />
      <Panel>
        <EmptyState icon="dashboard" title="Nothing to show yet" text={description} />
      </Panel>
    </>
  );
}
