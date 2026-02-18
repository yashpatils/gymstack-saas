import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[var(--brand-100)] text-[var(--accent)]",
  secondary: "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]",
  success: "bg-[var(--success-100)] text-[var(--success-600)]",
  warning: "bg-[var(--warning-100)] text-[var(--warning-600)]",
  destructive: "bg-[var(--danger-100)] text-[var(--danger-600)]",
  outline: "border border-[var(--border)] bg-transparent text-[var(--text-muted)]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
