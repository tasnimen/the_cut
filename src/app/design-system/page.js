import { notFound } from "next/navigation";
import { SiteFrame } from "@/components/layout/SiteFrame";
import { PageSection } from "@/components/layout/PageSection";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { TiltSurface } from "@/components/ui/TiltSurface";
import { MotionReveal } from "@/components/motion/MotionReveal";
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

      <p className="design-system-note">This route is available in development only ({ROUTES.designSystem}).</p>
    </SiteFrame>
  );
}
