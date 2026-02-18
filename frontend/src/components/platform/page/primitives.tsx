import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="w-full space-y-[var(--space-xl)] px-4 py-4 lg:px-8 lg:py-6">{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-[var(--space-md)]">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-[var(--space-xs)] text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-[var(--space-sm)]">{actions}</div> : null}
    </header>
  );
}

export function PageSection({ children }: { children: ReactNode }) {
  return <section className="space-y-[var(--space-md)]">{children}</section>;
}

export function PageGrid({ children, columns = 3 }: { children: ReactNode; columns?: 1 | 2 | 3 | 4 }) {
  const cols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
  }[columns];

  return <div className={`grid gap-[var(--space-md)] ${cols}`}>{children}</div>;
}

export function PageCard({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <article className="rounded-[var(--radius-xl)] border border-white/10 bg-slate-900/50 p-[var(--space-lg)]">
      {title ? <h2 className="mb-[var(--space-sm)] text-lg font-semibold">{title}</h2> : null}
      {children}
    </article>
  );
}
