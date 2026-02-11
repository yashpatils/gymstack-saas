import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-blue-600 text-white",
  secondary: "bg-slate-200 text-slate-900",
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-slate-900",
  destructive: "bg-red-600 text-white",
  outline: "border border-slate-300 bg-transparent text-slate-700",
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
