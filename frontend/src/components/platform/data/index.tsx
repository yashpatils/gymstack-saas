import type { ReactNode } from "react";
import BaseDataTable, { type DataTableColumn, type DataTableProps } from "../../DataTable";

export type { DataTableColumn };

export function DataTable<TData>(props: DataTableProps<TData>) {
  return <BaseDataTable {...props} />;
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-[var(--space-lg)]">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-[var(--space-sm)] text-2xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-[var(--space-xs)] text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-muted/30 p-[var(--space-xl)] text-center">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-[var(--space-xs)] text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-[var(--space-md)]">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return <div className="rounded-[var(--radius-lg)] border border-border bg-muted/20 p-[var(--space-lg)] text-sm text-muted-foreground">{message}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-[var(--radius-lg)] border border-rose-500/40 bg-rose-500/10 p-[var(--space-lg)] text-sm text-destructive">{message}</div>;
}
