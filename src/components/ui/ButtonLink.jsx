import { Button } from "@/components/ui/Button";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "regular",
  className = "",
}) {
  return <Button href={href} variant={variant} size={size} className={className}>
    {children}
  </Button>;
}
