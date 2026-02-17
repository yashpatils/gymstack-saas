import type { ReactNode } from "react";

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-[var(--space-md)] rounded-[var(--radius-lg)] border border-white/10 p-[var(--space-lg)]">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-[var(--space-xs)] text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-[var(--space-sm)]">{children}</div>;
}

export function FormDialog({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="space-y-[var(--space-md)] rounded-[var(--radius-xl)] border border-white/10 bg-slate-900 p-[var(--space-lg)]">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
      {actions ? <FormActions>{actions}</FormActions> : null}
    </div>
  );
}
