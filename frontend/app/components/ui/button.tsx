import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 disabled:bg-indigo-500/70",
  secondary:
    "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 disabled:text-slate-400",
  ghost: "bg-transparent text-slate-300 hover:text-white hover:bg-white/10",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/80 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
