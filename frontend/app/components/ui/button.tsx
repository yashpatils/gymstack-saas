import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 disabled:bg-indigo-500/70",
  secondary:
    "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 disabled:text-slate-400",
  ghost: "bg-transparent text-slate-300 hover:text-white hover:bg-white/10",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/80 disabled:cursor-not-allowed ${variantStyles[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
