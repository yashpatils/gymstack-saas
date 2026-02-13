import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type ToastVariant = "default" | "success" | "warning" | "destructive";

const variantClasses: Record<ToastVariant, string> = {
  default: "border-slate-200 bg-white text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  destructive: "border-red-200 bg-red-50 text-red-900",
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
            className="shrink-0 rounded-md p-1 text-current/70 transition hover:bg-black/5 hover:text-current"
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
        "inline-flex items-center rounded-md border border-current/20 px-3 py-1.5 text-xs font-medium transition hover:bg-black/5",
        className,
      )}
      {...props}
    />
  );
}
