import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Props = { href: ComponentProps<typeof Link>["href"]; children: React.ReactNode; variant?: "primary" | "ghost"; external?: boolean };

export function Button({ href, children, variant = "primary", external }: Props) {
  const cls = variant === "primary" ? "bg-fg text-bg hover:opacity-90" : "border border-border hover:bg-muted";
  const base = `inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition ${cls}`;
  if (external && typeof href === "string") {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={base}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={base}>
      {children}
    </Link>
  );
}
