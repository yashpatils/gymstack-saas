import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type AlertVariant = "default" | "success" | "warning" | "destructive";

const variantClasses: Record<AlertVariant, string> = {
  default: "border-border bg-card text-foreground",
  success: "border-border bg-emerald-500/10 text-emerald-200",
  warning: "border-border bg-amber-500/10 text-amber-200",
  destructive: "border-border bg-destructive/15 text-destructive-foreground",
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("relative w-full rounded-lg border p-4", variantClasses[variant], className)}
      {...props}
    />
  );
}

export interface AlertTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}

export interface AlertDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return <p className={cn("text-sm leading-relaxed", className)} {...props} />;
}
