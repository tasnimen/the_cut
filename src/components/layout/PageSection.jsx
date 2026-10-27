import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const pageSectionVariants = cva("section", {
  variants: {
    spacing: {
      standard: "section--standard",
      compact: "section--compact",
      spacious: "section--spacious",
    },
  },
  defaultVariants: { spacing: "standard" },
});

export function PageSection({
  as: Element = "section",
  spacing,
  className,
  children,
  ...props
}) {
  return (
    <Element className={cn(pageSectionVariants({ spacing }), className)} {...props}>
      {children}
    </Element>
  );
}
