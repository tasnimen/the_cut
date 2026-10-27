import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { cn } from "@/lib/utils/cn";

export function SiteFrame({
  children,
  activePath,
  headerVariant = "overlay",
  mainId,
  mainClassName,
}) {
  return (
    <>
      <SiteHeader activePath={activePath} variant={headerVariant} />
      <main id={mainId} className={cn(mainClassName)}>{children}</main>
      <SiteFooter />
    </>
  );
}
