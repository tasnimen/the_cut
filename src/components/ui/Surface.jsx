import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const surfaceVariants = cva("surface", {
  variants: {
    glass: {
      solid: "surface--solid",
      sm: "surface--glass-sm",
      md: "surface--glass-md",
      lg: "surface--glass-lg",
    },
    depth: {
      flat: "surface--depth-flat",
      raised: "surface--depth-raised",
      floating: "surface--depth-floating",
    },
    interactive: {
      true: "surface--interactive",
      false: "",
    },
  },
  defaultVariants: {
    glass: "solid",
    depth: "raised",
    interactive: false,
  },
});

export function Surface({
  as: Element = "div",
  glass,
  depth,
  interactive,
  className,
  children,
  ...props
}) {
  return (
    <Element
      className={cn(surfaceVariants({ glass, depth, interactive }), className)}
      {...props}
    >
      {children}
    </Element>
  );
}
