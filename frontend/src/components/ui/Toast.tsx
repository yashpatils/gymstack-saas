import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type ToastVariant = "default" | "success" | "warning" | "destructive";

const variantClasses: Record<ToastVariant, string> = {
  default: "border-border bg-card text-foreground",
  success: "border-border bg-emerald-500/10 text-emerald-200",
  warning: "border-border bg-amber-500/10 text-amber-200",
  destructive: "border-border bg-destructive/15 text-destructive-foreground",
};

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  heading?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
}

export function Toast({
  className,
  variant = "default",
  heading,
  description,
  action,
  onClose,
  children,
  ...props
}: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "w-full max-w-sm rounded-lg border p-4 shadow-lg",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {heading ? <p className="text-sm font-semibold">{heading}</p> : null}
          {description ? <p className="mt-1 text-sm opacity-90">{description}</p> : null}
          {children}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
        {onClose ? (
          <button
            type="button"
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-current/70 transition hover:bg-accent/30 hover:text-current"
            onClick={onClose}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface ToastViewportProps extends HTMLAttributes<HTMLDivElement> {}

export function ToastViewport({ className, ...props }: ToastViewportProps) {
  return (
    <div
      className={cn("fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2", className)}
      {...props}
    />
  );
}

export interface ToastActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export function ToastAction({ className, type = "button", ...props }: ToastActionProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center rounded-md border border-current/20 px-3 py-1.5 text-xs font-medium transition hover:bg-accent/30",
        className,
      )}
      {...props}
    />
  );
}
