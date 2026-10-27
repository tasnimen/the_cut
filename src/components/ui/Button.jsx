import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";

const buttonVariants = cva("button", {
  variants: {
    variant: {
      primary: "",
      outline: "button-outline",
      card: "button-card",
      control: "button-control",
    },
    size: {
      regular: "",
      small: "button-small",
      card: "",
      control: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "regular",
  },
});

export function Button({
  href,
  children,
  variant = "primary",
  size = "regular",
  className = "",
  icon = "arrowUpRight",
  ...props
}) {
  const classes = cn(buttonVariants({ variant, size }), className);
  const content = <>
    <span>{children}</span>
    {icon ? <Icon name={icon} size={size === "control" ? 17 : 14} aria-hidden="true" /> : null}
  </>;

  if (href) {
    return <Link className={classes} href={href} {...props}>{content}</Link>;
  }

  return <button className={classes} type="button" {...props}>{content}</button>;
}
