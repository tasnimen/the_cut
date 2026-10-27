import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export function Button({
  href,
  children,
  variant = "primary",
  size = "regular",
  className = "",
  icon = "arrowUpRight",
  ...props
}) {
  const classes = `button button-${variant} button-${size} ${className}`.trim();
  const content = <>
    <span>{children}</span>
    {icon ? <Icon name={icon} size={size === "control" ? 17 : 14} aria-hidden="true" /> : null}
  </>;

  if (href) {
    return <Link className={classes} href={href} {...props}>{content}</Link>;
  }

  return <button className={classes} type="button" {...props}>{content}</button>;
}
