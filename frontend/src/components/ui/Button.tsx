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
    "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-violet-300",
  secondary:
    "border border-border bg-secondary text-foreground backdrop-blur-sm hover:bg-accent/40 hover:ring-1 hover:ring-ring/40 focus-visible:ring-ring",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-accent/30 hover:ring-1 hover:ring-ring/40 focus-visible:ring-ring",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-accent/30 hover:text-foreground focus-visible:ring-ring",
  destructive:
    "bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.35)] hover:brightness-110 focus-visible:ring-red-400",
  link: "bg-transparent text-primary underline-offset-4 hover:underline focus-visible:ring-ring",
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
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
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
