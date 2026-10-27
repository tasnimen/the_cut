import { cn } from "@/lib/utils/cn";

export function PageContainer({ as: Element = "div", className, children, ...props }) {
  return (
    <Element className={cn("page-shell", className)} {...props}>
      {children}
    </Element>
  );
}
