import * as React from "react";

export function PageCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card/60 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageCardHeader({
  title,
  action,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-4 ${className}`}>
      <div className="text-base font-semibold">{title}</div>
      {action}
    </div>
  );
}

export function PageCardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}
