import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:ring-blue-400",
  secondary:
    "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200 focus-visible:ring-slate-300",
  outline:
    "border border-slate-300 bg-transparent text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-300",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300",
  destructive:
    "bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:ring-red-400",
  link: "bg-transparent text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-400",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-9 rounded-md px-3 text-xs",
  lg: "h-11 rounded-md px-6 text-base",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
