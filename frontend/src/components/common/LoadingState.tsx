export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

export function KpiSkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`kpi-skeleton-${index}`} className="section-card space-y-3">
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="section-card" aria-hidden="true">
      <div className="space-y-3">
        <div className="skeleton h-10 w-full" />
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`table-skeleton-${rowIndex}`} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <div key={`table-skeleton-${rowIndex}-${columnIndex}`} className="skeleton h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
