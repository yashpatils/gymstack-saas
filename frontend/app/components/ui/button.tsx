import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

const baseStyles =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/80 disabled:cursor-not-allowed";

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:brightness-105 hover:ring-1 hover:ring-indigo-300/40 disabled:brightness-90",
  secondary:
    "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:ring-1 hover:ring-white/25 disabled:text-slate-400",
  ghost: "bg-transparent text-slate-300 hover:text-white hover:bg-white/10 hover:ring-1 hover:ring-white/20",
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
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
