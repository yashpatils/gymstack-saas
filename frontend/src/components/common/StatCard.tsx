export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
