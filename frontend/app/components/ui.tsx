import React from "react";

type ButtonProps = {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
};

const buttonVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400",
  secondary:
    "bg-white/10 text-white hover:bg-white/20 border border-white/10",
  outline:
    "border border-white/20 text-white hover:bg-white/10",
  ghost: "text-white/70 hover:text-white hover:bg-white/10",
};

const buttonSizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-11 px-6 text-sm",
  sm: "h-9 px-4 text-sm",
  lg: "h-12 px-8 text-base",
};

export function Button({
  children,
  variant = "default",
  size = "default",
  className,
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${buttonVariants[variant]} ${buttonSizes[size]} ${
        className ?? ""
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] ${
        className ?? ""
      }`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`space-y-2 ${className ?? ""}`}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-white">{children}</h3>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-300">{children}</p>;
}

export function AccessDenied({
  title,
  message,
  details,
}: {
  title: string;
  message: string;
  details?: string[];
}) {
  return (
    <div className="card access-denied">
      <h3 className="access-denied-title">{title}</h3>
      <p>{message}</p>
      {details?.length ? (
        <ul className="access-denied-list">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
