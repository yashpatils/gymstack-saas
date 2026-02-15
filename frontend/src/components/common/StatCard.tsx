import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  change,
  icon,
  hint,
}: {
  label: string;
  value: string;
  change?: string;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <article className="stat-card-modern">
      <div className="stat-card-top">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        {icon ? <span className="stat-card-icon">{icon}</span> : null}
      </div>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
      {change ? <p className="mt-1 text-sm text-emerald-300">{change}</p> : null}
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
