import { notFound } from "next/navigation";
import { SiteFrame } from "@/components/layout/SiteFrame";
import { PageSection } from "@/components/layout/PageSection";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { TiltSurface } from "@/components/ui/TiltSurface";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { DashboardError } from "@/features/dashboard/components/DashboardError";
import { DataTable, EmptyState, LoadingBlock, PageHeader, Panel, StatCard } from "@/features/dashboard/components/primitives";
import { ROUTES } from "@/config/routes";
import { site } from "@/config/site";

export const metadata = {
  title: `Design System | ${site.name}`,
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <SiteFrame activePath={ROUTES.designSystem} headerVariant="flow" mainClassName="page-shell design-system-page">
      <header>
        <p className="eyebrow">Phase C · shared UI foundations</p>
        <h1>Design system</h1>
        <p className="design-system-intro">Reusable controls, depth surfaces, motion, and typography for The Cut.</p>
      </header>

      <PageSection spacing="compact" className="design-system-section" aria-labelledby="design-buttons-title">
        <p className="eyebrow">01 · Actions</p>
        <h2 id="design-buttons-title">Buttons and focus</h2>
        <div className="design-system-button-row">
          <Button>Primary action</Button>
          <Button variant="outline">Secondary action</Button>
          <Button variant="control" size="control" icon={null} aria-label="Control sample">+</Button>
        </div>
      </PageSection>

      <PageSection spacing="compact" className="design-system-section" aria-labelledby="design-surfaces-title">
        <p className="eyebrow">02 · Surfaces</p>
        <h2 id="design-surfaces-title">Glass and depth</h2>
        <div className="design-system-surface-grid">
          <Surface glass="sm" depth="raised" className="design-system-surface">
            <strong>Glass small</strong><span>10px blur · subtle tint</span>
          </Surface>
          <Surface glass="md" depth="floating" className="design-system-surface">
            <strong>Glass medium</strong><span>16px blur · ambient lift</span>
          </Surface>
          <TiltSurface glass="lg" depth="floating" interactive className="design-system-surface">
            <strong>Glass large</strong><span>22px blur · pointer tilt</span>
          </TiltSurface>
        </div>
      </PageSection>

      <PageSection spacing="compact" className="design-system-section" aria-labelledby="design-motion-title">
        <p className="eyebrow">03 · Motion</p>
        <h2 id="design-motion-title">Reveal and scroll</h2>
        <MotionReveal className="design-system-motion">
          <strong>Reduced-motion aware reveal</strong>
          <span>Lenis and ScrollTrigger share one GSAP ticker when motion is allowed.</span>
        </MotionReveal>
      </PageSection>

      <PageSection spacing="compact" className="design-system-section" aria-labelledby="design-dashboard-title">
        <p className="eyebrow">04 · Dashboard primitives</p>
        <h2 id="design-dashboard-title">Cards, tables and states</h2>
        <p className="design-system-note">Sample values for layout review only. This dev route is never shown to visitors, and the real dashboards never use sample data.</p>
        <PageHeader eyebrow="Sample" title="Page header" description="Title, description and actions." />
        <div className="dash-stat-grid">
          <StatCard label="Sample stat" value="12" hint="Sample hint" icon="calendar" />
          <StatCard label="Missing value" value={null} hint="Shown as a dash" icon="users" />
        </div>
        <Panel title="Sample table" action={{ href: ROUTES.designSystem, label: "View all" }}>
          <DataTable caption="Sample table" columns={[{ key: "a", label: "Column A" }, { key: "b", label: "Column B" }]} rows={[{ id: "1", cells: { a: "Row one", b: "Value" } }]} />
        </Panel>
        <Panel title="Empty table"><DataTable caption="Empty" columns={[{ key: "a", label: "A" }]} rows={[]} emptyText="Real dashboards show this state until data exists." /></Panel>
        <Panel title="Loading"><LoadingBlock lines={3} /></Panel>
        <Panel title="Empty state"><EmptyState icon="inbox" title="Nothing here yet" text="Explain what will appear and how to add it." action={{ href: ROUTES.designSystem, label: "Primary action" }} /></Panel>
        <Panel title="Error state"><DashboardError reset={() => {}} /></Panel>
      </PageSection>

      <p className="design-system-note">This route is available in development only ({ROUTES.designSystem}).</p>
    </SiteFrame>
  );
}
