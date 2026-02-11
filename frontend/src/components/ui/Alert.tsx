import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type AlertVariant = "default" | "success" | "warning" | "destructive";

const variantClasses: Record<AlertVariant, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  destructive: "border-red-200 bg-red-50 text-red-900",
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
